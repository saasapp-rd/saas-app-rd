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

  const body = await req.json()
  const { student_id, course_id } = body
  if (!student_id || !course_id)
    return NextResponse.json({ error: "student_id and course_id required" }, { status: 400 })

  // Pull the course's block as the default. Caller can override via
  // block_number when attaching a placeholder/Options course to a
  // specific block (the enrollment row carries its own block_number
  // so the same placeholder course can land in different slots for
  // different students).
  const { data: course, error: courseErr } = await db
    .from("courses")
    .select("block_number")
    .eq("id", course_id)
    .maybeSingle()
  if (courseErr) return NextResponse.json({ error: courseErr.message }, { status: 500 })
  if (!course)   return NextResponse.json({ error: "Course not found" }, { status: 404 })

  let blockToUse: number | null = course.block_number as number | null
  if (typeof body.block_number === "number" && body.block_number >= 1 && body.block_number <= 9) {
    blockToUse = body.block_number
  }

  // Upsert on the (student, course, year) unique key. Idempotent if the
  // student is already enrolled. Block overlays are explicitly allowed —
  // the unique key isn't on block_number.
  const { error } = await db
    .from("student_enrollments")
    .upsert(
      {
        student_id,
        course_id,
        block_number: blockToUse,
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
