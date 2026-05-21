import { NextRequest, NextResponse } from "next/server"
import { getServerSession }            from "next-auth"
import { authOptions }                 from "@/lib/auth"
import { db }                          from "@/lib/supabase"
import { sendPushToRole }              from "@/lib/push"
import { getCurrentPeriod }            from "@/lib/schedule"

const ALLOWED = ["coordinator","dean","admin","super_admin"]

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !ALLOWED.includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { student_id, reason, level } = await req.json()
  if (!student_id)
    return NextResponse.json({ error: "student_id required" }, { status: 400 })

  // students were merged into users (migration 011) — query users table
  const { data: stu } = await db
    .from("users")
    .select("first_name, last_name")
    .eq("id", student_id)
    .single()

  const name = stu ? stu.last_name + ", " + stu.first_name : "Unknown"

  const period  = await getCurrentPeriod()
  const blockId = period.type === "block" ? period.blockNumber : null
  const incLevel = level === "elevated" ? "elevated" : "routine"

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

  const { data, error } = await db
    .from("incidents")
    .insert({
      student_id,
      reported_by:  session.user.userId,
      report_type:  "absent_from_start",
      initiated_by: "coordinator_pull",
      period_type:  period.type,
      level:        incLevel,
      status:       preEmpted ? "located" : "open",
      pre_empted_at: preEmpted ? now : null,
      block_id:     blockId,
    })
    .select("id")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!preEmpted) {
    await sendPushToRole("coordinator", {
      title: "Missing Student Reported — " + name,
      body:  reason?.trim() ? reason.trim() : "Pulled by " + session.user.displayName,
    }).catch(() => {})
  }

  return NextResponse.json(
    preEmpted ? { pre_empted: true, staff_name: ciStaffName, id: data.id } : { id: data.id },
    { status: 201 }
  )
}
