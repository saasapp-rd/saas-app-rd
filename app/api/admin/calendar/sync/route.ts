import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/supabase"
import { parseIcs, classifyDayType } from "@/lib/icsParser"

const ADMIN   = ["admin", "super_admin"]
// Seattle Academy's daily-block calendar feed. Eventually replaced by Veracross.
const ICS_URL = "https://www.seattleacademy.org/fs/calendar-manager/events.ics?calendar_ids[]=605"

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session || !ADMIN.includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let text: string
  try {
    const res = await fetch(ICS_URL, { cache: "no-store" })
    if (!res.ok) {
      return NextResponse.json(
        { error: `Feed responded ${res.status}` },
        { status: 502 }
      )
    }
    text = await res.text()
  } catch (e) {
    return NextResponse.json(
      { error: `Could not reach feed: ${(e as Error).message}` },
      { status: 502 }
    )
  }

  const events = parseIcs(text)
  if (events.length === 0)
    return NextResponse.json({ error: "Feed had no events" }, { status: 422 })

  // Find existing rows so we can skip days the admin has manually edited.
  const dates = [...new Set(events.map(e => e.startDate))]
  const { data: existing } = await db
    .from("school_calendar")
    .select("date, source")
    .in("date", dates)

  const manualDates = new Set(
    (existing ?? [])
      .filter(r => r.source === "manual")
      .map(r => r.date as string)
  )

  // Build upsert rows. Deduplicate by date — last event per date wins.
  const rowByDate = new Map<string, Record<string, unknown>>()
  let skippedManual = 0

  for (const ev of events) {
    if (manualDates.has(ev.startDate)) {
      skippedManual++
      continue
    }
    const { dayType, isSpecial } = classifyDayType(ev.summary)
    rowByDate.set(ev.startDate, {
      date:          ev.startDate,
      day_type:      dayType,
      is_school_day: true,
      is_special:    isSpecial,
      note:          isSpecial ? ev.summary : null,
      source:        "synced",
    })
  }

  const rows = [...rowByDate.values()]
  let synced  = 0
  let special = 0

  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200)
    const { error } = await db
      .from("school_calendar")
      .upsert(batch, { onConflict: "date" })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    synced += batch.length
    special += batch.filter(r => r.is_special).length
  }

  return NextResponse.json({
    synced,
    special,
    skipped_manual: skippedManual,
    total_events:   events.length,
  })
}
