import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/supabase"
import { parseCSV, col } from "@/lib/csvParser"

/**
 * Accepts the Veracross student-courses export (CSV/TSV):
 *   Person ID, Last Name, Current Grade, Advisor, Class Enrollments
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
 * Warnings include:
 *   - Unknown students (Person ID not in DB).
 *   - Unknown courses (Class ID not in DB) — with student name and the
 *     description from the CSV so admin can spot what's missing.
 *   - Block overlays (student has 2+ enrollments in same block). The
 *     overlapping enrollments are still inserted; flag is for review.
 */

const ACADEMIC_YEAR = "2025-26"

interface ClassRef {
  classId:     string
  description: string  // from the CSV, after the first colon
}

interface ParsedRow {
  vcId:        string
  lastName:    string
  advisorName: string
  classes:     ClassRef[]
}

// Bus-route enrollments come through the same Veracross feed as classes
// (e.g. "BUS520-FAM", "BUSMAG-FPM", "BUSAA-FAM"). They aren't academic
// courses and we don't want to clutter the warnings list with them.
function isBusRoute(classId: string): boolean {
  return /^BUS/i.test(classId) || /-(FAM|FPM)$/i.test(classId)
}

function parseClassEnrollments(raw: string): ClassRef[] {
  if (!raw) return []
  const out: ClassRef[] = []
  // Veracross emits "ID1: Desc1, ID2: Desc2". Descriptions can contain
  // colons (e.g. "Hannah Advisory:2029"), so the second split must use
  // indexOf — not split(":") which would over-fragment.
  for (const pair of raw.split(",")) {
    const trimmed = pair.trim()
    if (!trimmed) continue
    const colon       = trimmed.indexOf(":")
    const classId     = (colon > -1 ? trimmed.slice(0, colon)     : trimmed).trim()
    const description = (colon > -1 ? trimmed.slice(colon + 1) : "").trim()
    if (classId && !isBusRoute(classId)) out.push({ classId, description })
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
    const vcId           = col(row, "person_id", "veracross_id", "id")
    const lastName       = col(row, "last_name", "lastname")
    const advisorName    = col(row, "advisor")
    const enrollmentsCol = col(row, "class_enrollments", "classes", "enrollments", "courses")

    if (!vcId) { errors.push(`Row ${n}: missing Person ID`); return }
    const classes = parseClassEnrollments(enrollmentsCol)
    byVcId.set(vcId, { vcId, lastName, advisorName, classes })
  })

  const parsed = [...byVcId.values()]
  if (!parsed.length)
    return NextResponse.json({ errors, processed: 0 }, { status: 400 })

  // Render a student's label like "110790 Andrews" for warnings. Falls
  // back to just the Person ID if the CSV had no Last Name.
  function label(p: ParsedRow): string {
    return p.lastName ? `${p.vcId} ${p.lastName}` : `Person ID ${p.vcId}`
  }

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
  const allClassIds = [...new Set(parsed.flatMap(p => p.classes.map(c => c.classId)))]
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

  const courseByClassId = new Map<string, { id: string; block: number | null }>()
  for (const c of courseRows ?? []) {
    if (c.class_id) {
      courseByClassId.set(String(c.class_id), {
        id:    c.id as string,
        block: (c.block_number ?? null) as number | null,
      })
    }
  }

  // ── Create placeholder courses for class IDs not in the system ────
  // Auto-add so admin doesn't have to manually create each one. Block is
  // null on these (requires migration 026) — they show red on /admin/courses
  // until admin assigns a block + teacher. Enrollments to placeholders are
  // skipped here (block NOT NULL on student_enrollments); next re-import
  // after admin fills them in will create the enrollments.
  const missingByClassId = new Map<string, string>()  // class_id → description
  for (const p of parsed) {
    for (const c of p.classes) {
      if (courseByClassId.has(c.classId)) continue
      if (!missingByClassId.has(c.classId)) {
        missingByClassId.set(c.classId, c.description || c.classId)
      }
    }
  }

  let coursesCreated = 0
  if (missingByClassId.size > 0) {
    const placeholders = [...missingByClassId.entries()].map(([class_id, name]) => ({
      class_id,
      name,
      block_number: null,
      is_active: true,
    }))

    const { data: created, error: createErr } = await db
      .from("courses")
      .insert(placeholders)
      .select("id, class_id, block_number")

    if (createErr) {
      warnings.push(`Could not auto-create placeholder courses: ${createErr.message}`)
    } else {
      coursesCreated = created?.length ?? 0
      for (const c of created ?? []) {
        if (c.class_id) {
          courseByClassId.set(String(c.class_id), {
            id:    c.id as string,
            block: c.block_number as number | null,
          })
        }
      }
    }
  }

  // ── Build new enrollment set + collect mismatches ─────────────────
  const studentIdsToWipe = new Set<string>()
  const enrollmentKeys   = new Set<string>()
  const newEnrollments: { student_id: string; course_id: string; block_number: number; academic_year: string }[] = []
  const studentsNotFound = new Set<string>()
  const coursesNotFound  = new Set<string>()
  // For overlay detection: studentId → block → list of class IDs that are
  // about to be inserted in that block.
  const blockUsageByStudent = new Map<string, Map<number, { classId: string; description: string }[]>>()

  // Placeholder courses (block_number NULL) — couldn't enroll yet but
  // surfaced so admin can fix on /admin/courses.
  const placeholderEnrollmentsSkipped = new Set<string>()  // "studentId:classId"

  for (const p of parsed) {
    const studentId = studentByVcId.get(p.vcId)
    if (!studentId) {
      studentsNotFound.add(p.vcId)
      warnings.push(`${label(p)} — student not in system; skipped`)
      continue
    }
    studentIdsToWipe.add(studentId)

    for (const c of p.classes) {
      const course = courseByClassId.get(c.classId)
      if (!course) {
        // Shouldn't happen now — auto-create above. Keep as safety net.
        coursesNotFound.add(c.classId)
        const desc = c.description ? ` "${c.description}"` : ""
        warnings.push(`${label(p)} — course ${c.classId}${desc} not in system; enrollment skipped`)
        continue
      }
      if (course.block === null) {
        // Placeholder course — block not yet assigned. Skip enrollment.
        placeholderEnrollmentsSkipped.add(`${studentId}:${c.classId}`)
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

      // Track block usage so we can flag overlays after the loop.
      const blockMap = blockUsageByStudent.get(studentId) ?? new Map<number, { classId: string; description: string }[]>()
      const list     = blockMap.get(course.block) ?? []
      list.push({ classId: c.classId, description: c.description })
      blockMap.set(course.block, list)
      blockUsageByStudent.set(studentId, blockMap)
    }
  }

  // ── Overlay warnings: any student with 2+ classes in the same block ─
  // Also collect rows for the data_issues queue (persisted, resolvable).
  type IssueInsert = {
    source: string; kind: string; ref_type: string | null; ref_id: string | null
    title: string; details: Record<string, unknown>
  }
  const issuesToInsert: IssueInsert[] = []

  let overlaysFound = 0
  for (const p of parsed) {
    const studentId = studentByVcId.get(p.vcId)
    if (!studentId) continue
    const blockMap = blockUsageByStudent.get(studentId)
    if (!blockMap) continue
    for (const [block, classes] of blockMap) {
      if (classes.length > 1) {
        overlaysFound++
        const tags = classes
          .map(c => c.description ? `${c.classId} "${c.description}"` : c.classId)
          .join(", ")
        const blockLabel = block === 9 ? "advisory block" : `block ${block}`
        warnings.push(`${label(p)} — overlay in ${blockLabel}: ${tags} (enrollments kept; review manually)`)
        issuesToInsert.push({
          source:   "enrollments_import",
          kind:     "block_overlay",
          ref_type: "user",
          ref_id:   studentId,
          title:    `${label(p)} — overlay in ${blockLabel}`,
          details:  {
            student_vc_id: p.vcId,
            student_last_name: p.lastName,
            block,
            classes,
          },
        })
      }
    }
  }

  // One issue per placeholder course (deduped — same course referenced by
  // many students). Records affected students in details so admin sees
  // the impact at a glance.
  if (missingByClassId.size > 0) {
    const affectedByClassId = new Map<string, string[]>()
    for (const p of parsed) {
      for (const c of p.classes) {
        if (!missingByClassId.has(c.classId)) continue
        const list = affectedByClassId.get(c.classId) ?? []
        list.push(`${p.vcId} ${p.lastName}`.trim())
        affectedByClassId.set(c.classId, list)
      }
    }

    for (const [classId, desc] of missingByClassId) {
      const affected = affectedByClassId.get(classId) ?? []
      const courseRef = courseByClassId.get(classId)
      issuesToInsert.push({
        source:   "enrollments_import",
        kind:     "course_needs_review",
        ref_type: "course",
        ref_id:   courseRef?.id ?? null,
        title:    `${classId} "${desc}" auto-created — needs block & teacher (${affected.length} student${affected.length === 1 ? "" : "s"} pending enrollment)`,
        details:  {
          class_id: classId,
          description: desc,
          affected_students: affected,
        },
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

  // ── Persist data-quality issues for the Review Queue ─────────────
  // Wipe prior OPEN issues from this source so re-uploads don't
  // duplicate. Resolved/dismissed entries stay so admins don't have
  // to dismiss the same thing twice.
  await db.from("data_issues").delete()
    .eq("source", "enrollments_import")
    .eq("status", "open")

  if (issuesToInsert.length > 0) {
    // Chunked insert in case the run flagged thousands of issues.
    for (let i = 0; i < issuesToInsert.length; i += 500) {
      await db.from("data_issues").insert(issuesToInsert.slice(i, i + 500))
    }
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
    courses_created:       coursesCreated,
    placeholder_skipped:   placeholderEnrollmentsSkipped.size,
    overlays_found:        overlaysFound,
    // Diagnostics
    total_courses_in_db:   totalCoursesInDb ?? 0,
    courses_with_class_id: coursesWithClassId ?? 0,
    class_ids_requested:   allClassIds.length,
    class_ids_matched:     courseByClassId.size,
    warnings:              warnings.length ? warnings : undefined,
    errors:                errors.length   ? errors   : undefined,
  })
}
