import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/supabase"

const ALLOWED = ["teacher", "admin", "super_admin"]

async function ownsCourse(courseId: string, userId: string): Promise<boolean> {
  const { data } = await db
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .eq("teacher_id", userId)
    .single()
  return !!data
}

// POST /api/teacher/enrollment — add student to course
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !ALLOWED.includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { course_id, student_id } = await req.json()
  if (!course_id || !student_id)
    return NextResponse.json({ error: "course_id and student_id required" }, { status: 400 })

  // Teachers can only modify their own courses
  if (session.user.role === "teacher") {
    const owns = await ownsCourse(course_id, session.user.userId)
    if (!owns)
      return NextResponse.json({ error: "Not your course" }, { status: 403 })
  }

  // Get course to pull block_number + academic_year
  const { data: course } = await db
    .from("courses")
    .select("block_number, academic_year")
    .eq("id", course_id)
    .single()
  if (!course)
    return NextResponse.json({ error: "Course not found" }, { status: 404 })

  const { error } = await db.from("student_enrollments").insert({
    student_id,
    course_id,
    block_number:  course.block_number,
    academic_year: course.academic_year,
  })

  if (error) {
    if (error.code === "23505")
      return NextResponse.json(
        { error: "Student is already enrolled in another course this block." },
        { status: 409 }
      )
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}

// DELETE /api/teacher/enrollment — remove student from course
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !ALLOWED.includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { course_id, student_id } = await req.json()
  if (!course_id || !student_id)
    return NextResponse.json({ error: "course_id and student_id required" }, { status: 400 })

  if (session.user.role === "teacher") {
    const owns = await ownsCourse(course_id, session.user.userId)
    if (!owns)
      return NextResponse.json({ error: "Not your course" }, { status: 403 })
  }

  const { error } = await db
    .from("student_enrollments")
    .delete()
    .eq("course_id", course_id)
    .eq("student_id", student_id)

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
