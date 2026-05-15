import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/supabase"

const ADMIN = ["admin", "super_admin"]

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !ADMIN.includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")  // open | resolved | dismissed | all

  let q = db.from("data_issues")
    .select("id, source, kind, ref_type, ref_id, title, details, status, created_at, resolved_at, resolved_by, notes")
    .order("created_at", { ascending: false })
    .range(0, 9999)

  if (status && status !== "all") q = q.eq("status", status)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !ADMIN.includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { id, status, notes } = body
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
  if (status && !["open","resolved","dismissed"].includes(status))
    return NextResponse.json({ error: "invalid status" }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (status) {
    updates.status = status
    if (status === "open") {
      updates.resolved_at = null
      updates.resolved_by = null
    } else {
      updates.resolved_at = new Date().toISOString()
      updates.resolved_by = session.user.userId
    }
  }
  if (notes !== undefined) updates.notes = notes ? String(notes).trim() || null : null

  const { error } = await db.from("data_issues").update(updates).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
