import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !["admin","super_admin","coordinator","counselor","dean"].includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { student_id } = await req.json()
  if (!student_id) return NextResponse.json({ error: "student_id required" }, { status: 400 })

  const { data, error } = await db
    .from("incidents")
    .insert({
      student_id,
      reported_by:         session.user.userId,
      status:              "open",
      level:               "routine",
      report_type:         "welfare_concern",
      suppress_email_home: false,
    })
    .select("id")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
