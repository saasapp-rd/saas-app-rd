import { NextRequest, NextResponse } from "next/server"
import { getServerSession }           from "next-auth"
import { authOptions }                from "@/lib/auth"
import { db }                         from "@/lib/supabase"

const RELEASE_ROLES  = ["coordinator","dean","admin","super_admin"]
const UNDO_WINDOW_MS = 5 * 60 * 1000   // 5 minutes

// ── DELETE — hard-delete within the 5-minute undo window ─────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const { data: row } = await db
    .from("student_check_ins")
    .select("id, staff_id, created_at")
    .eq("id", id)
    .single()

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const isCreator = row.staff_id === session.user.userId
  const isPriv    = RELEASE_ROLES.includes(session.user.role)
  if (!isCreator && !isPriv)
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  const ageMs = Date.now() - new Date(row.created_at).getTime()
  if (ageMs > UNDO_WINDOW_MS)
    return NextResponse.json({ error: "Undo window expired (5 minutes have passed)" }, { status: 410 })

  const { error } = await db.from("student_check_ins").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// ── PATCH — manual release (set released_at) ─────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const { data: row } = await db
    .from("student_check_ins")
    .select("id, staff_id")
    .eq("id", id)
    .single()

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const isCreator = row.staff_id === session.user.userId
  const isPriv    = RELEASE_ROLES.includes(session.user.role)
  if (!isCreator && !isPriv)
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })

  const { error } = await db
    .from("student_check_ins")
    .update({ released_at: new Date().toISOString(), released_reason: "manual" })
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
