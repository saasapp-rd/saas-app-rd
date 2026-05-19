import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/supabase"

const ALLOWED      = ["admin","super_admin","coordinator","counselor","dean"]
const ACADEMIC_YEAR = "2025-26"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !ALLOWED.includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { student_id, course_id } = await req.json()
  if (!student_id || !course_id)
    return NextResponse.json({ error: "student_id and course_id required" }, { status: 400 })

  // Pull the course's block so we can write the denormalized block_number.
  const { data: course, error: courseErr } = await db
    .from("courses")
    .select("block_number")
    .eq("id", course_id)
    .maybeSingle()
  if (courseErr) return NextResponse.json({ error: courseErr.message }, { status: 500 })
  if (!course)   return NextResponse.json({ error: "Course not found" }, { status: 404 })

  // Upsert on the (student, course, year) unique key. Idempotent if the
  // student is already enrolled. Block overlays are explicitly allowed —
  // the unique key isn't on block_number.
  const { error } = await db
    .from("student_enrollments")
    .upsert(
      {
        student_id,
        course_id,
        block_number: course.block_number,
        academic_year: ACADEMIC_YEAR,
      },
      { onConflict: "student_id,course_id,academic_year" }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !ALLOWED.includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { student_id, course_id } = await req.json()
  if (!student_id || !course_id)
    return NextResponse.json({ error: "student_id and course_id required" }, { status: 400 })

  const { error } = await db
    .from("student_enrollments")
    .delete()
    .eq("student_id", student_id)
    .eq("course_id",  course_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
