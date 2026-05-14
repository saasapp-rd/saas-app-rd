import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/supabase"

const ADMIN = ["admin", "super_admin"]

// Manual edit of a single day. Sets source='manual' so a subsequent .ics
// sync won't overwrite the change.
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !ADMIN.includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { date } = body
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return NextResponse.json({ error: "valid date (YYYY-MM-DD) required" }, { status: 400 })

  const row: Record<string, unknown> = {
    date,
    source: "manual",
  }

  if (body.day_type === null || (typeof body.day_type === "number" && [1,2,3,4].includes(body.day_type))) {
    row.day_type = body.day_type
  }
  if (typeof body.is_school_day === "boolean")
    row.is_school_day = body.is_school_day
  if (typeof body.is_special === "boolean")
    row.is_special = body.is_special
  if (body.note !== undefined)
    row.note = body.note ? String(body.note).trim() || null : null

  const { error } = await db.from("school_calendar").upsert(row, { onConflict: "date" })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// Reset a manual override (delete the row so the next sync repopulates).
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !ADMIN.includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { date } = await req.json()
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 })

  const { error } = await db.from("school_calendar").delete().eq("date", date)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
