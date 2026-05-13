import { NextRequest, NextResponse } from "next/server"
import { getServerSession }            from "next-auth"
import { authOptions }                 from "@/lib/auth"
import { db }                          from "@/lib/supabase"
import { sendPushToRole }              from "@/lib/push"

const STEP_ROLES   = ["coordinator","counselor","dean","admin","super_admin"]
const STEP_ACTIONS = ["step_1","step_2","step_3","step_4","step_5","step_6",
                      "escalate","resolve","found","with_me"]

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !STEP_ROLES.includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { incident_id, action, note } = await req.json()
  if (!incident_id || !STEP_ACTIONS.includes(action))
    return NextResponse.json({ error: "incident_id and valid action required" }, { status: 400 })

  const now = new Date().toISOString()

  const { data: inc, error: fetchErr } = await db
    .from("incidents")
    .select("id, status, level, student_id, students(first_name, last_name)")
    .eq("id", incident_id)
    .single()

  if (fetchErr || !inc)
    return NextResponse.json({ error: "Incident not found" }, { status: 404 })

  const rawStudent = (inc as any).students
  const student    = Array.isArray(rawStudent) ? (rawStudent[0] ?? null) : (rawStudent ?? null)
  const name       = student ? student.last_name + ", " + student.first_name : "Unknown"

  let update: Record<string, unknown> = {}

  switch (action) {
    case "step_1":  update = { step_1_sent_at:   now }; break
    case "step_2":  update = { step_2_sent_at:   now }; break
    case "step_3":
      update = { step_3_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() }
      break
    case "step_4":  update = { step_4_logged_at: now }; break
    case "step_5":  update = { step_5_logged_at: now }; break
    case "step_6":
      update = { step_6_sent_at: now, status: "resolved", resolved_at: now }
      break
    case "resolve":
      update = { status: "resolved", resolved_at: now }
      break
    case "found":
      update = {
        status:           "located",
        located_location: note?.trim() || null,
        located_excused:  false,
      }
      break
    case "with_me":
      update = {
        status:           "located",
        located_location: note?.trim() || "With coordinator",
        located_excused:  true,
      }
      break
    case "escalate":
      update = { level: "elevated" }
      await sendPushToRole("coordinator", {
        title: "ESCALATED — " + name,
        body:  "Incident escalated to elevated level",
      }).catch(() => {})
      break
  }

  const { data, error } = await db
    .from("incidents")
    .update(update)
    .eq("id", incident_id)
    .select("id, status, level, step_1_sent_at, step_2_sent_at, step_3_expires_at, step_4_logged_at, step_5_logged_at, step_6_sent_at, located_location, located_excused")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (action === "step_6" || action === "resolve") {
    await sendPushToRole("teacher", {
      title: "Student Located — " + name,
      body:  "Incident resolved. No further action needed.",
    }).catch(() => {})
  }

  return NextResponse.json(data)
}
