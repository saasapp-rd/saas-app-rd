import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/supabase"

/**
 * PATCH /api/admin/system-settings
 *
 * Super-admin-only. Admins can READ via getSystemSettings() server-side
 * (no GET endpoint needed; the settings page fetches directly).
 *
 * Accepts a partial body — only sent fields are updated. Empty strings
 * are valid for the credential fields (means "clear"); the column
 * defaults to ''.
 */
// school_name intentionally omitted — this is the Seattle Academy app
// and the name is hardcoded, not editable through the UI or API.
const STRING_FIELDS = [
  "academic_year",
  "google_client_id", "google_client_secret",
  "veracross_api_url", "veracross_api_key",
] as const

const BOOL_FIELDS = [
  "push_on_missing", "push_on_elevated", "push_on_welfare_concern",
  "email_on_step3",
] as const

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "super_admin")
    return NextResponse.json({ error: "Unauthorized — super-admin only." }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const updates: Record<string, unknown> = {}

  for (const f of STRING_FIELDS) {
    if (typeof body[f] === "string") updates[f] = body[f].trim()
  }
  for (const f of BOOL_FIELDS) {
    if (typeof body[f] === "boolean") updates[f] = body[f]
  }
  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 })

  if ("academic_year" in updates && !updates.academic_year)
    return NextResponse.json({ error: "academic_year cannot be empty." }, { status: 400 })

  updates.updated_at = new Date().toISOString()
  updates.updated_by = session.user.userId

  // Upsert against the singleton row (id = 1) — handles the case where
  // the table exists but the seed row didn't make it in.
  const { error } = await db
    .from("system_settings")
    .upsert({ id: 1, ...updates }, { onConflict: "id" })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
