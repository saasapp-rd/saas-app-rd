import { NextRequest, NextResponse } from "next/server"
import { getServerSession }            from "next-auth"
import { authOptions }                 from "@/lib/auth"
import { db }                          from "@/lib/supabase"
import { sendEmailHome }               from "@/lib/email"
import { sendPushToRole }              from "@/lib/push"

// Teachers/staff can use with_me; coordinators+ can use all protocol steps
const ALLOWED    = ["teacher", "staff", "coordinator", "counselor", "dean", "admin", "super_admin"]
const COORD_ONLY = ["step_1","step_2","step_3","step_4","step_5","step_6","escalate"]

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !ALLOWED.includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { incident_id, action, note } = await req.json()
  if (!incident_id || !action)
    return NextResponse.json({ error: "incident_id and action required" }, { status: 400 })

  if (COORD_ONLY.includes(action) &&
      !["coordinator","dean","admin","super_admin"].includes(session.user.role))
    return NextResponse.json({ error: "Coordinator role required" }, { status: 403 })

  const now    = new Date().toISOString()
  const userId = session.user.userId
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updates: Record<string, any> = {}

  switch (action) {
    case "step_1":
      updates.step_1_sent_at = now
      break

    case "step_2":
      updates.step_2_sent_at = now
      break

    case "step_3":
      updates.step_3_expires_at = now
      // Email home to parent (fire-and-forget — suppress_email_home checked inside helper)
      sendEmailHome(incident_id).catch(() => {})
      break

    case "step_4":
      updates.step_4_logged_at = now
      break

    case "step_5":
      updates.step_5_logged_at = now
      updates.level            = "elevated"
      // Push to deans on escalation
      sendPushToRole("dean", {
        title: "Incident Escalated",
        body:  "A student incident has been elevated to dean review.",
        url:   "/dean",
      }).catch(() => {})
      break

    case "step_6":
      updates.step_6_sent_at = now
      break

    case "escalate":
      updates.level = "elevated"
      sendPushToRole("dean", {
        title: "Incident Escalated",
        body:  "A student has been escalated to elevated status.",
        url:   "/dean",
      }).catch(() => {})
      break

    case "found":
      updates.status           = "resolved"
      updates.located_at       = now
      updates.located_by       = userId
      updates.located_location = note ?? "Located"
      updates.resolved_at      = now
      updates.resolved_by      = userId
      break

    case "with_me":
      updates.status           = "resolved"
      updates.located_at       = now
      updates.located_by       = userId
      updates.located_location = "With " + session.user.role
      updates.located_excused  = true
      updates.resolved_at      = now
      updates.resolved_by      = userId
      break

    default:
      return NextResponse.json({ error: "Unknown action: " + action }, { status: 400 })
  }

  const { error } = await db.from("incidents").update(updates).eq("id", incident_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, action })
}
