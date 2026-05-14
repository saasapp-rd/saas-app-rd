import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/supabase"
import { parseCSV, col } from "@/lib/csvParser"

/**
 * Accepts the Veracross course-schedule export (CSV/TSV):
 *   School Level, Primary Grade Level, Course, Class ID, Description,
 *   Teacher, TEACHER: Person ID, Room, Meeting Times
 *
 * - "Course" (e.g. "ACAL2001") is stored as course_code for grouping
 *   sections; "Class ID" (e.g. "ACAL2001-11") is the dedup key for an
 *   individual section; "Description" is the human name.
 * - Block number is extracted from Meeting Times with /B(\d+)/i
 *   (e.g. "Odd-FwdOdd-Rev-B3-US" → 3). Odd-Fwd/Odd-Rev metadata is
 *   ignored — the block number alone determines when the course meets.
 * - Teacher matched by veracross_id first, then "Last, First" name.
 * - Unmatched teachers are surfaced as warnings; the course still
 *   imports with teacher_id = null.
 * - Requires migrations 019 and 020.
 */

interface ParsedRow {
  classId:      string
  courseCode:   string
  name:         string
  teacherName:  string
  teacherVcId:  string | null
  schoolLevel:  string
  gradeLevel:   string
  room:         string
  meetingTimes: string
  blockNumber:  number
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
  const parsed:   ParsedRow[] = []
  const seen = new Set<string>()

  rows.forEach((row, i) => {
    const n = i + 2

    const classId     = col(row, "class_id", "classid", "id")
    const courseCode  = col(row, "course", "course_code", "coursecode")
    const name        = col(row, "description", "course_name", "name")
    const teacherName = col(row, "teacher", "teacher_name")
    const teacherVcId = col(row,
      "teacher_person_id",      // "TEACHER: Person ID" normalizes to this
      "teacher_personid",
      "teacher_id",
      "teacher:_person_id",     // belt-and-suspenders for varied normalizers
    )
    const schoolLevel  = col(row, "school_level", "schoollevel")
    const gradeLevel   = col(row, "primary_grade_level", "grade_level", "grade")
    const room         = col(row, "room")
    const meetingTimes = col(row, "meeting_times", "meetingtimes", "meeting")

    if (!classId) { errors.push(`Row ${n}: missing Class ID`); return }
    if (!name)    { errors.push(`Row ${n}: missing Description`); return }
    if (seen.has(classId)) { errors.push(`Row ${n}: duplicate Class ID "${classId}"`); return }

    const m     = /\bB(\d+)\b/i.exec(meetingTimes)
    const block = m ? parseInt(m[1], 10) : NaN
    if (!Number.isFinite(block) || block < 1 || block > 8) {
      warnings.push(
        `Row ${n} (${classId}): could not parse block from "${meetingTimes}" — skipped`
      )
      return
    }

    seen.add(classId)
    parsed.push({
      classId, courseCode, name, teacherName,
      teacherVcId: teacherVcId || null,
      schoolLevel, gradeLevel, room, meetingTimes,
      blockNumber: block,
    })
  })

  if (!parsed.length)
    return NextResponse.json({ errors, warnings, processed: 0 }, { status: 400 })

  // ── Resolve teachers ──────────────────────────────────────────────
  // Pull every active teacher/advisor once; build two lookup maps.
  const { data: teacherRows } = await db
    .from("users")
    .select("id, veracross_id, last_name, first_name, display_name")
    .in("role", ["teacher", "advisor"])
    .eq("is_active", true)

  const idByVcId  = new Map<string, string>()
  const idByName  = new Map<string, string>()  // "last,first" lowercased
  for (const t of teacherRows ?? []) {
    if (t.veracross_id) idByVcId.set(String(t.veracross_id), t.id as string)
    if (t.last_name && t.first_name) {
      idByName.set(
        `${String(t.last_name).toLowerCase()},${String(t.first_name).toLowerCase()}`,
        t.id as string
      )
    }
  }

  function lookupTeacher(p: ParsedRow): string | null {
    if (p.teacherVcId) {
      const byId = idByVcId.get(p.teacherVcId)
      if (byId) return byId
    }
    if (p.teacherName) {
      const [last, first] = p.teacherName.split(",").map(s => s.trim().toLowerCase())
      if (last && first) return idByName.get(`${last},${first}`) ?? null
    }
    return null
  }

  // ── Find existing courses by class_id ─────────────────────────────
  const classIds = parsed.map(p => p.classId)
  const { data: existingRows } = await db
    .from("courses")
    .select("id, class_id")
    .in("class_id", classIds)

  const idByClassId = new Map<string, string>()
  for (const r of existingRows ?? []) {
    if (r.class_id) idByClassId.set(r.class_id as string, r.id as string)
  }

  // ── Build inserts and updates ─────────────────────────────────────
  const inserts: object[] = []
  const updates: { id: string; rec: object }[] = []
  const unmatchedTeachers = new Set<string>()

  for (const p of parsed) {
    const teacherId = lookupTeacher(p)
    if (!teacherId && p.teacherName) {
      const label = p.teacherVcId
        ? `${p.teacherName} (Person ID ${p.teacherVcId})`
        : p.teacherName
      unmatchedTeachers.add(label)
      warnings.push(`${p.classId}: teacher "${label}" not in system — course imported without teacher`)
    }

    const rec = {
      class_id:      p.classId,
      course_code:   p.courseCode || null,
      name:          p.name,
      block_number:  p.blockNumber,
      room:          p.room || null,
      teacher_id:    teacherId,
      school_level:  p.schoolLevel || null,
      grade_level:   p.gradeLevel  || null,
      meeting_times: p.meetingTimes || null,
      is_active:     true,
    }

    const existingId = idByClassId.get(p.classId)
    if (existingId) updates.push({ id: existingId, rec })
    else            inserts.push(rec)
  }

  // ── Apply ─────────────────────────────────────────────────────────
  let dbError: string | undefined

  for (let i = 0; i < inserts.length && !dbError; i += 200) {
    const { error } = await db.from("courses").insert(inserts.slice(i, i + 200))
    if (error) dbError = error.message
  }

  if (!dbError && updates.length) {
    const results = await Promise.allSettled(
      updates.map(u => db.from("courses").update(u.rec).eq("id", u.id))
    )
    const failed = results.find(r =>
      r.status === "rejected" ||
      (r.status === "fulfilled" && (r.value as { error: { message: string } | null }).error)
    )
    if (failed) {
      dbError = failed.status === "fulfilled"
        ? (failed.value as { error: { message: string } | null }).error?.message
        : "Update failed"
    }
  }

  if (dbError) return NextResponse.json({ error: dbError, warnings, errors }, { status: 500 })

  return NextResponse.json({
    processed:           parsed.length,
    inserted:            inserts.length,
    updated:             updates.length,
    unmatched_teachers:  [...unmatchedTeachers],
    skipped:             rows.length - parsed.length,
    warnings:            warnings.length ? warnings : undefined,
    errors:              errors.length   ? errors   : undefined,
  })
}
