import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/supabase"
import { getCurrentPeriod } from "@/lib/schedule"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !["admin","super_admin","coordinator","counselor","dean","teacher","staff"].includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { student_id } = await req.json()
  if (!student_id) return NextResponse.json({ error: "student_id required" }, { status: 400 })

  const period = await getCurrentPeriod()

  const { data, error } = await db
    .from("incidents")
    .insert({
      student_id,
      reported_by:         session.user.userId,
      status:              "open",
      level:               "routine",
      report_type:         "absent_from_start",
      initiated_by:        "coordinator_pull",
      period_type:         period.type,
      block_id:            period.type === "block" ? period.blockNumber : null,
      suppress_email_home: false,
    })
    .select("id")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
