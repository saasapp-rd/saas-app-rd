import { NextRequest, NextResponse } from "next/server"
import { getServerSession }            from "next-auth"
import { authOptions }                 from "@/lib/auth"
import { db }                          from "@/lib/supabase"

const ALLOWED = ["coordinator","counselor","dean","admin","super_admin"]

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !ALLOWED.includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { incident_id, body } = await req.json()
  if (!incident_id || !body?.trim())
    return NextResponse.json({ error: "incident_id and body required" }, { status: 400 })

  const { data, error } = await db
    .from("incident_notes")
    .insert({ incident_id, user_id: session.user.userId, body: body.trim() })
    .select("id, body, created_at, author:user_id(display_name)")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
