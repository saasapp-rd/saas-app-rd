import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/supabase"
import { parseCSV, col } from "@/lib/csvParser"

/**
 * Expected CSV columns:
 *   Required : block (1–8), course_code, course_name, teacher_email, student_id
 *   Optional : room, academic_year (defaults to "2025-26")
 *
 * Behaviour:
 *  1. Upserts courses by (block_number, course_code, academic_year)
 *  2. Links each course to its teacher (looked up by email)
 *  3. Deletes all existing enrollments for courses in this import, then re-inserts
 *     → re-uploading the same CSV is safe and idempotent
 *
 * Edge cases handled:
 *  - Teacher not found → course created without teacher, warning issued
 *  - Student not found → row skipped, error reported
 *  - Student already enrolled in another class in same block → DB unique violation, reported
 *  - Duplicate (course_code, block, student_id) rows within same CSV → deduplicated silently
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !["admin", "super_admin"].includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const form = await req.formData()
  const file = form.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 })

  const rows = parseCSV(await file.text())
  if (!rows.length) return NextResponse.json({ error: "CSV has no data rows" }, { status: 400 })

  const errors: string[] = []
  const warnings: string[] = []

  // ── 1. Validate + normalise rows ─────────────────────────────────────────
  type ValidRow = {
    block: number; courseName: string; courseCode: string
    teacherEmail: string; studentId: string; room: string; year: string
  }
  const valid: ValidRow[] = []

  rows.forEach((row, i) => {
    const n            = i + 2
    const blockRaw     = col(row, "block", "block_id", "blockid", "period", "block_number")
    const courseName   = col(row, "course_name", "coursename", "class", "class_name", "subject", "course")
    const courseCode   = col(row, "course_code", "coursecode", "code", "section_code", "class_code")
    const teacherEmail = col(row, "teacher_email", "teacheremail", "teacher", "instructor", "instructor_email").toLowerCase()
    const studentId    = col(row, "student_id", "studentid", "student", "id", "veracross_id")
    const room         = col(row, "room", "room_number", "location")
    const year         = col(row, "academic_year", "year", "school_year") || "2025-26"

    if (!blockRaw)     { errors.push(`Row ${n}: missing block`);         return }
    if (!courseName)   { errors.push(`Row ${n}: missing course_name`);   return }
    if (!courseCode)   { errors.push(`Row ${n}: missing course_code`);   return }
    if (!teacherEmail) { errors.push(`Row ${n}: missing teacher_email`); return }
    if (!studentId)    { errors.push(`Row ${n}: missing student_id`);    return }

    const block = parseInt(blockRaw)
    if (isNaN(block) || block < 1 || block > 8)
      { errors.push(`Row ${n}: invalid block "${blockRaw}" (must be 1–8)`); return }

    valid.push({ block, courseName, courseCode, teacherEmail, studentId, room, year })
  })

  if (!valid.length)
    return NextResponse.json({ errors, warnings, coursesUpserted: 0, enrollments: 0 }, { status: 400 })

  // ── 2. Look up teachers by email ─────────────────────────────────────────
  const teacherEmails = [...new Set(valid.map(r => r.teacherEmail))]
  const { data: teacherRows } = await db
    .from("users")
    .select("id, email")
    .in("email", teacherEmails)
  const teacherMap = new Map((teacherRows ?? []).map(t => [t.email, t.id as string]))
  for (const e of teacherEmails) {
    if (!teacherMap.has(e)) warnings.push(`Teacher "${e}" not found — course will have no teacher assigned`)
  }

  // ── 3. Upsert courses ─────────────────────────────────────────────────────
  type CourseKey = string // "block:code:year"
  const courseInserts = new Map<CourseKey, object>()
  for (const r of valid) {
    const key = `${r.block}:${r.courseCode}:${r.year}`
    courseInserts.set(key, {
      block_number:  r.block,
      course_code:   r.courseCode,
      name:          r.courseName,
      teacher_id:    teacherMap.get(r.teacherEmail) ?? null,
      room:          r.room || null,
      academic_year: r.year,
      is_active:     true,
    })
  }

  const { data: upsertedCourses, error: courseErr } = await db
    .from("courses")
    .upsert([...courseInserts.values()], { onConflict: "block_number,course_code,academic_year" })
    .select("id, block_number, course_code, academic_year")
  if (courseErr) return NextResponse.json({ error: courseErr.message }, { status: 500 })

  const courseIdMap = new Map<CourseKey, string>()
  for (const c of (upsertedCourses ?? [])) {
    courseIdMap.set(`${c.block_number}:${c.course_code}:${c.academic_year}`, c.id as string)
  }

  // ── 4. Look up students by veracross_id ──────────────────────────────────
  const studentIds = [...new Set(valid.map(r => r.studentId))]
  const { data: studentRows } = await db
    .from("users")
    .select("id, veracross_id")
    .eq("role", "student")
    .in("veracross_id", studentIds)
  const studentMap = new Map((studentRows ?? []).map(s => [s.veracross_id as string, s.id as string]))
  for (const sid of studentIds) {
    if (!studentMap.has(sid)) errors.push(`Student ID "${sid}" not found — import students first`)
  }

  // ── 5. Clear existing enrollments for courses in this import ─────────────
  const affectedCourseIds = [...courseIdMap.values()]
  if (affectedCourseIds.length) {
    const { error: delErr } = await db
      .from("student_enrollments")
      .delete()
      .in("course_id", affectedCourseIds)
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })
  }

  // ── 6. Build + insert enrollments ────────────────────────────────────────
  const enrollSet = new Set<string>() // dedupe within CSV
  const enrollments: object[] = []

  for (const r of valid) {
    const courseId  = courseIdMap.get(`${r.block}:${r.courseCode}:${r.year}`)
    const studentDbId = studentMap.get(r.studentId)
    if (!courseId || !studentDbId) continue // already reported above

    const key = `${studentDbId}:${courseId}`
    if (enrollSet.has(key)) continue
    enrollSet.add(key)

    enrollments.push({
      student_id:    studentDbId,
      course_id:     courseId,
      block_number:  r.block,
      academic_year: r.year,
    })
  }

  let enrollErr: string | undefined
  for (let i = 0; i < enrollments.length; i += 200) {
    const { error } = await db
      .from("student_enrollments")
      .insert(enrollments.slice(i, i + 200))
    if (error) { enrollErr = error.message; break }
  }
  if (enrollErr) return NextResponse.json({ error: enrollErr }, { status: 500 })

  return NextResponse.json({
    coursesUpserted: courseInserts.size,
    enrollments:     enrollments.length,
    rowsSkipped:     valid.length - enrollments.length,
    warnings:        warnings.length ? warnings : undefined,
    errors:          errors.length   ? errors   : undefined,
  })
}
