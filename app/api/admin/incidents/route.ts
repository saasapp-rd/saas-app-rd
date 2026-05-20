import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/supabase"

const DELETE_ALLOWED = ["admin", "super_admin"]

/**
 * DELETE /api/admin/incidents
 * Body: { id: string }
 *
 * Permanently removes a single incident. Restricted to admin /
 * super_admin — coordinators / counselors should resolve or dismiss
 * via the normal workflow rather than delete.
 *
 * Also nukes any incident_notes that reference this incident so the
 * FK doesn't strand them.
 */
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !DELETE_ALLOWED.includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await req.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  // Drop dependent notes first (no ON DELETE CASCADE on this table).
  await db.from("incident_notes").delete().eq("incident_id", id)

  const { error } = await db.from("incidents").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
