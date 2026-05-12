import { NextRequest, NextResponse } from "next/server"
import { getServerSession }            from "next-auth"
import { authOptions }                 from "@/lib/auth"
import { db }                          from "@/lib/supabase"

const ALLOWED = ["coordinator","counselor","dean","admin","super_admin"]

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !ALLOWED.includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { incident_id, location, excused } = await req.json()
  if (!incident_id || !location?.trim())
    return NextResponse.json({ error: "incident_id and location required" }, { status: 400 })

  const now = new Date().toISOString()

  const { data, error } = await db
    .from("incidents")
    .update({
      located_location: location.trim(),
      located_excused:  excused ?? false,
      status:           "located",
      step_5_logged_at: now,
    })
    .eq("id", incident_id)
    .select("id, status, located_location")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
