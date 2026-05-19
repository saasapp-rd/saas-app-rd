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

  // Fetch student name up front — avoids a join on the insert select
  const { data: stu } = await db
    .from("students")
    .select("first_name, last_name")
    .eq("id", student_id)
    .single()

  const name = stu ? stu.last_name + ", " + stu.first_name : "Unknown"

  const period   = await getCurrentPeriod()
  const blockId  = period.type === "block" ? period.blockNumber : null
  const incLevel = level === "elevated" ? "elevated" : "routine"

  const { data, error } = await db
    .from("incidents")
    .insert({
      student_id,
      reported_by:  session.user.userId,
      report_type:  "coordinator_pull",
      initiated_by: "coordinator_pull",
      level:        incLevel,
      status:       "open",
      block_id:     blockId,
    })
    .select("id")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await sendPushToRole("coordinator", {
    title: "Coordinator Pull — " + name,
    body:  reason?.trim() ? reason.trim() : "Pulled by " + session.user.displayName,
  }).catch(() => {})

  return NextResponse.json({ id: data.id }, { status: 201 })
}
