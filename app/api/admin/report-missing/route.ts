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

  // Pre-emption: active check-in for this student?
  const now = new Date().toISOString()
  const { data: activeCI } = await db
    .from("student_check_ins")
    .select("id, staff:staff_id(display_name)")
    .eq("student_id", student_id)
    .is("released_at", null)
    .gt("expires_at", now)
    .limit(1)
  const preEmpted   = !!(activeCI && activeCI.length > 0)
  const ciStaffRaw  = preEmpted ? (Array.isArray(activeCI![0].staff) ? activeCI![0].staff[0] : activeCI![0].staff) : null
  const ciStaffName = (ciStaffRaw as any)?.display_name ?? "Staff"

  const period = await getCurrentPeriod()

  const { data, error } = await db
    .from("incidents")
    .insert({
      student_id,
      reported_by:         session.user.userId,
      status:              preEmpted ? "located" : "open",
      pre_empted_at:       preEmpted ? now : null,
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
  return NextResponse.json(
    preEmpted ? { pre_empted: true, staff_name: ciStaffName, ...data } : data,
    { status: 201 }
  )
}
