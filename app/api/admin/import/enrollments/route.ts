import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/supabase"
import { parseCSV, col } from "@/lib/csvParser"

/**
 * Accepts the Veracross student-courses export (CSV/TSV):
 *   Person ID, Last Name, Current Grade, Class Enrollments, Advisor
 *
 * Class Enrollments cell is a comma-separated list of
 *   "<Class ID>: <Description>" pairs, e.g.
 *   "AYHC20296: Hannah Advisory:2029, ENGL0901-14: English 9, ..."
 *
 * Per-student behaviour:
 *   - Look up the student by Person ID (= users.veracross_id).
 *   - Update users.advisor_name from the Advisor column.
 *   - DELETE existing enrollments and INSERT the new set — Veracross
 *     is the source of truth, dropped classes are removed.
 *
 * Missing students and unknown Class IDs are surfaced as warnings and
 * skipped, never blocking the rest of the import. Requires courses
 * and students to be imported first.
 */

const ACADEMIC_YEAR = "2025-26"

interface ParsedRow {
  vcId:         string
  advisorName:  string
  classIds:     string[]
}

function parseClassEnrollments(raw: string): string[] {
  if (!raw) return []
  const out: string[] = []
  // Veracross emits "ID1: Desc1, ID2: Desc2". Descriptions can contain
  // colons (e.g. "Hannah Advisory:2029"), so the second split must use
  // indexOf — not split(":") which would over-fragment.
  for (const pair of raw.split(",")) {
    const trimmed = pair.trim()
    if (!trimmed) continue
    const colon = trimmed.indexOf(":")
    const id = (colon > -1 ? trimmed.slice(0, colon) : trimmed).trim()
    if (id) out.push(id)
  }
  return out
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !["admin", "super_admin"].includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const form = await req.formData()
  const file = form.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 })

  const rows = parseCSV(await file.text())
  if (!rows.length) return NextResponse.json({ error: "CSV has no data rows" }, { status: 400 })

  const errors:   string[] = []
  const warnings: string[] = []
  const byVcId    = new Map<string, ParsedRow>()  // dedupe same student appearing twice

  rows.forEach((row, i) => {
    const n = i + 2
    const vcId          = col(row, "person_id", "veracross_id", "id")
    const advisorName   = col(row, "advisor")
    const enrollmentsCol = col(row, "class_enrollments", "classes", "enrollments", "courses")

    if (!vcId) { errors.push(`Row ${n}: missing Person ID`); return }
    const classIds = parseClassEnrollments(enrollmentsCol)
    byVcId.set(vcId, { vcId, advisorName, classIds })
  })

  const parsed = [...byVcId.values()]
  if (!parsed.length)
    return NextResponse.json({ errors, processed: 0 }, { status: 400 })

  // ── Resolve students ──────────────────────────────────────────────
  const vcIds = parsed.map(p => p.vcId)
  const { data: studentRows } = await db
    .from("users")
    .select("id, veracross_id")
    .eq("role", "student")
    .in("veracross_id", vcIds)

  const studentByVcId = new Map<string, string>()
  for (const s of studentRows ?? []) {
    if (s.veracross_id) studentByVcId.set(String(s.veracross_id), s.id as string)
  }

  // ── Resolve courses ───────────────────────────────────────────────
  const allClassIds = [...new Set(parsed.flatMap(p => p.classIds))]
  const { data: courseRows } = allClassIds.length > 0
    ? await db.from("courses")
        .select("id, class_id, block_number")
        .in("class_id", allClassIds)
    : { data: [] as { id: string; class_id: string; block_number: number }[] }

  // Diagnostics — helps catch "no courses in DB" vs. "courses present but
  // class_id column NULL" without the user needing to dive into Supabase.
  const { count: totalCoursesInDb } = await db
    .from("courses")
    .select("*", { count: "exact", head: true })
  const { count: coursesWithClassId } = await db
    .from("courses")
    .select("*", { count: "exact", head: true })
    .not("class_id", "is", null)

  const courseByClassId = new Map<string, { id: string; block: number }>()
  for (const c of courseRows ?? []) {
    if (c.class_id) {
      courseByClassId.set(String(c.class_id), {
        id:    c.id as string,
        block: c.block_number as number,
      })
    }
  }

  // ── Build new enrollment set + collect mismatches ─────────────────
  const studentIdsToWipe = new Set<string>()
  const enrollmentKeys   = new Set<string>()
  const newEnrollments: { student_id: string; course_id: string; block_number: number; academic_year: string }[] = []
  const studentsNotFound = new Set<string>()
  const coursesNotFound  = new Set<string>()

  for (const p of parsed) {
    const studentId = studentByVcId.get(p.vcId)
    if (!studentId) {
      studentsNotFound.add(p.vcId)
      warnings.push(`Person ID ${p.vcId}: student not in system — skipped`)
      continue
    }
    studentIdsToWipe.add(studentId)

    for (const classId of p.classIds) {
      const course = courseByClassId.get(classId)
      if (!course) {
        coursesNotFound.add(classId)
        warnings.push(`Person ID ${p.vcId}: course ${classId} not in system — enrollment skipped`)
        continue
      }
      // Dedup within this import (in case the CSV had duplicates).
      const key = `${studentId}:${course.id}`
      if (enrollmentKeys.has(key)) continue
      enrollmentKeys.add(key)
      newEnrollments.push({
        student_id:    studentId,
        course_id:     course.id,
        block_number:  course.block,
        academic_year: ACADEMIC_YEAR,
      })
    }
  }

  // ── Full-replace: wipe existing enrollments for these students ────
  if (studentIdsToWipe.size > 0) {
    const { error: delErr } = await db
      .from("student_enrollments")
      .delete()
      .in("student_id", [...studentIdsToWipe])
      .eq("academic_year", ACADEMIC_YEAR)
    if (delErr)
      return NextResponse.json({ error: `Could not clear existing enrollments: ${delErr.message}` }, { status: 500 })
  }

  // ── Insert new enrollments ───────────────────────────────────────
  let inserted = 0
  for (let i = 0; i < newEnrollments.length; i += 500) {
    const batch = newEnrollments.slice(i, i + 500)
    const { error } = await db.from("student_enrollments").insert(batch)
    if (error)
      return NextResponse.json({ error: `Insert failed: ${error.message}`, inserted, warnings }, { status: 500 })
    inserted += batch.length
  }

  // ── Update advisor_name on each student ──────────────────────────
  const advisorUpdates = parsed
    .filter(p => p.advisorName && studentByVcId.has(p.vcId))
    .map(p => ({ id: studentByVcId.get(p.vcId)!, advisor_name: p.advisorName }))

  if (advisorUpdates.length > 0) {
    await Promise.allSettled(
      advisorUpdates.map(u =>
        db.from("users").update({ advisor_name: u.advisor_name }).eq("id", u.id)
      )
    )
  }

  return NextResponse.json({
    processed:             parsed.length,
    students_enrolled:     studentIdsToWipe.size,
    enrollments:           inserted,
    students_not_found:    studentsNotFound.size,
    courses_not_found:     coursesNotFound.size,
    // Diagnostics
    total_courses_in_db:   totalCoursesInDb ?? 0,
    courses_with_class_id: coursesWithClassId ?? 0,
    class_ids_requested:   allClassIds.length,
    class_ids_matched:     courseByClassId.size,
    warnings:              warnings.length ? warnings : undefined,
    errors:                errors.length   ? errors   : undefined,
  })
}
