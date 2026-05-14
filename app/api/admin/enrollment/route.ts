import { NextRequest, NextResponse } from "next/server"
import { getServerSession }          from "next-auth"
import { authOptions }               from "@/lib/auth"
import { db }                        from "@/lib/supabase"

const ALLOWED = ["admin", "super_admin"]

// POST — upsert enrollment for a student+course combo.
// Replaces any existing enrollment in the same block for that student.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !ALLOWED.includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { student_id, course_id } = await req.json()
  if (!student_id || !course_id)
    return NextResponse.json({ error: "student_id and course_id required" }, { status: 400 })

  const { data: course } = await db
    .from("courses")
    .select("block_number, academic_year")
    .eq("id", course_id)
    .single()
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 })

  // Remove any existing enrollment in this block first (upsert won't work cleanly
  // because course_id is part of the row but not the conflict key)
  await db
    .from("student_enrollments")
    .delete()
    .eq("student_id", student_id)
    .eq("block_number", course.block_number)
    .eq("academic_year", course.academic_year)

  const { error } = await db.from("student_enrollments").insert({
    student_id,
    course_id,
    block_number:  course.block_number,
    academic_year: course.academic_year,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true }, { status: 201 })
}

// DELETE — remove a single enrollment by id
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !ALLOWED.includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { enrollment_id } = await req.json()
  if (!enrollment_id)
    return NextResponse.json({ error: "enrollment_id required" }, { status: 400 })

  const { error } = await db
    .from("student_enrollments")
    .delete()
    .eq("id", enrollment_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
