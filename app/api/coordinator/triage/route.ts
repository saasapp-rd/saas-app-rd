import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/supabase"

const COORD_ROLES = ["coordinator", "dean", "admin", "super_admin"]

// Maps triage button labels to a plain-text note (stored as incident note, not enum)
const TRIAGE_LABELS: Record<string, string> = {
  sports_dismissal:    "Sports dismissal",
  off_campus_trip:     "Off-campus trip",
  accommodations_room: "Accommodations room",
  parent_signed_out:   "Parent signed out",
  sub_error:           "Sub didn't take attendance",
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !COORD_ROLES.includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { incident_id, action, context_tag } = await req.json()
  if (!incident_id || !action)
    return NextResponse.json({ error: "incident_id and action required" }, { status: 400 })

  const now = new Date().toISOString()

  if (action === "false_positive") {
    // status: "resolved" is a valid enum value; store the reason as a note
    const { error } = await db.from("incidents").update({
      status:      "resolved",     // "false_positive" not in schema enum — use "resolved"
      resolved_at: now,
      resolved_by: session.user.userId,
      // Store the false-positive reason in located_location for now (Wave 6 adds proper notes)
      located_location: TRIAGE_LABELS[context_tag] ?? "False positive",
    }).eq("id", incident_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, action: "false_positive" })
  }

  if (action === "confirm") {
    const { error } = await db.from("incidents").update({
      step_1_sent_at: now,
    }).eq("id", incident_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, action: "confirm", incident_id })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
