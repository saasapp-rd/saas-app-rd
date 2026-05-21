import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/supabase"
import { parseCSV, col, normalizePhone } from "@/lib/csvParser"

/**
 * Accepts the exact Veracross parent contact export (CSV):
 *   Person ID, Last Name, Preferred Name, Email 1,
 *   PARENT 1: Person ID, PARENT 1: Preferred Name, PARENT 1: Last Name,
 *   PARENT 1: Email 1, PARENT 1: Mobile Phone,
 *   ... (PARENT 2 – PARENT 4 same structure)
 *
 * Matches students by Person ID (veracross_id) and updates their
 * `parents` JSONB field plus the legacy `parent_email` / `parent_name`.
 */

interface ParentContact {
  person_id:      string | null
  preferred_name: string | null
  last_name:      string | null
  email:          string | null
  phone:          string | null
}

function extractParent(row: Record<string, string>, n: number): ParentContact | null {
  const p = `parent_${n}_`
  const preferred = col(row, `${p}preferred_name`)
  const last      = col(row, `${p}last_name`)
  const email     = col(row, `${p}email_1`)
  const phone     = col(row, `${p}mobile_phone`)
  const person_id = col(row, `${p}person_id`)

  // Skip entirely empty parent slots
  if (!preferred && !last && !email) return null

  return {
    person_id:      person_id  || null,
    preferred_name: preferred  || null,
    last_name:      last       || null,
    email:          email.toLowerCase() || null,
    phone:          normalizePhone(phone),
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "super_admin")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const form = await req.formData()
  const file = form.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 })

  const rows = parseCSV(await file.text())
  if (!rows.length) return NextResponse.json({ error: "CSV has no data rows" }, { status: 400 })

  // Build records: { veracross_id, parents[], parent_email, parent_name }
  const records: {
    veracross_id: string
    parents:      ParentContact[]
    parent_email: string | null
    parent_name:  string | null
  }[] = []

  const parseErrors: string[] = []

  rows.forEach((row, i) => {
    const n   = i + 2
    const sid = col(row, "person_id", "student_id", "veracross_id")
    if (!sid) { parseErrors.push(`Row ${n}: missing Person ID — skipped`); return }

    const parents = [1, 2, 3, 4]
      .map(n => extractParent(row, n))
      .filter((p): p is ParentContact => p !== null)

    if (parents.length === 0) return // student has no parent data, skip silently

    records.push({
      veracross_id: sid,
      parents,
      parent_email: parents[0]?.email ?? null,
      parent_name:  [parents[0]?.preferred_name, parents[0]?.last_name]
        .filter(Boolean).join(" ") || null,
    })
  })

  if (!records.length)
    return NextResponse.json({ errors: parseErrors, processed: 0 }, { status: 400 })

  // Batch parallel updates (50 at a time) — update existing students only
  const BATCH    = 50
  let updated    = 0
  let notFound   = 0
  const dbErrors: string[] = []

  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH)
    const results = await Promise.allSettled(
      batch.map(r =>
        db.from("users")
          .update({
            parents:      r.parents,
            parent_email: r.parent_email,
            parent_name:  r.parent_name,
          })
          .eq("veracross_id", r.veracross_id)
          .eq("role", "student")
          .select("id")
          .maybeSingle()
      )
    )

    for (const res of results) {
      if (res.status === "rejected") {
        dbErrors.push(String(res.reason))
      } else if (res.value.error) {
        dbErrors.push(res.value.error.message)
      } else if (!res.value.data) {
        notFound++
      } else {
        updated++
      }
    }
  }

  return NextResponse.json({
    processed: updated,
    not_found: notFound || undefined,
    errors:    [...parseErrors, ...dbErrors].length ? [...parseErrors, ...dbErrors] : undefined,
  })
}
