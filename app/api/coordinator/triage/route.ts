import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/supabase"

const COORD_ROLES = ["coordinator", "dean", "admin", "super_admin"]

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !COORD_ROLES.includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { incident_id, action, context_tag } = await req.json()
  if (!incident_id || !action)
    return NextResponse.json({ error: "incident_id and action required" }, { status: 400 })

  const now = new Date().toISOString()

  if (action === "false_positive") {
    const { error } = await db.from("incidents").update({
      status:      "false_positive",
      context_tag: context_tag ?? null,
      resolved_at: now,
      resolved_by: session.user.userId,
    }).eq("id", incident_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, action: "false_positive" })
  }

  if (action === "confirm") {
    // Start workflow — mark step 1 timestamp
    const { error } = await db.from("incidents").update({
      step_1_sent_at: now,
    }).eq("id", incident_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, action: "confirm", incident_id })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
