import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/supabase"

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !["admin","super_admin","coordinator","counselor","dean"].includes(session.user.role))
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
