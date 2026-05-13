import { NextRequest, NextResponse }           from "next/server"
import { getServerSession }                    from "next-auth"
import { authOptions }                         from "@/lib/auth"
import { db }                                  from "@/lib/supabase"
import { getCurrentPeriod }                    from "@/lib/schedule"
import { sendPushToRole }                      from "@/lib/push"

const ALLOWED = ["staff", "teacher", "coordinator", "counselor", "dean", "admin", "super_admin"]

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !ALLOWED.includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { student_id, note } = await req.json()
  if (!student_id)
    return NextResponse.json({ error: "student_id required" }, { status: 400 })

  const period   = await getCurrentPeriod()
  const block_id = (period as any).currentBlock ?? null

  const { data: incident, error } = await db.from("incidents").insert({
    student_id,
    reported_by:         session.user.userId,
    period_type:         block_id ? "block" : "community",
    report_type:         "welfare_concern",
    initiated_by:        "welfare_concern",
    level:               "elevated",
    block_id,
    suppress_email_home: false,
    status:              "open",
  }).select("id, block_id, student:student_id(first_name, last_name)").single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Supabase returns joins as arrays — normalise to single object | null
  const rawStudent = (incident as any).student
  const student = Array.isArray(rawStudent)
    ? (rawStudent[0] as { first_name: string; last_name: string } | undefined) ?? null
    : (rawStudent as { first_name: string; last_name: string } | null)
  const fullName = student ? student.last_name + ", " + student.first_name : "Student"

  const payload = {
    title: "Welfare Concern — " + (block_id ? "Block " + block_id : "Community"),
    body:  fullName + " — reported by " + session.user.displayName,
    url:   "/coordinator",
  }
  await Promise.allSettled([
    sendPushToRole("coordinator", payload),
    sendPushToRole("dean",        payload),
    sendPushToRole("counselor",   payload),
  ])

  return NextResponse.json(incident, { status: 201 })
}
