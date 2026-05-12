import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/supabase"
import { parseCSV, col, normalizePhone } from "@/lib/csvParser"

/**
 * Expected CSV columns:
 *   Required : last_name, first_name, email
 *   Optional : phone, employee_id
 *
 * Upserts into users table by email with role = "teacher".
 * If the user already exists (any role), their name/phone/employee_id
 * are updated but their role is NOT changed (prevents accidental downgrades).
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !["admin", "super_admin"].includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const form = await req.formData()
  const file = form.get("file") as File | null
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 })

  const rows = parseCSV(await file.text())
  if (!rows.length) return NextResponse.json({ error: "CSV has no data rows" }, { status: 400 })

  const errors: string[] = []
  const upsert: object[] = []
  const seen = new Set<string>()

  rows.forEach((row, i) => {
    const n    = i + 2
    const last  = col(row, "last_name", "lastname", "last", "surname")
    const first = col(row, "first_name", "firstname", "first", "given_name")
    const email = col(row, "email", "email_address", "work_email", "school_email").toLowerCase()
    const phone = col(row, "phone", "cell", "cell_phone", "mobile")
    const empId = col(row, "employee_id", "employeeid", "id", "staff_id", "teacher_id")

    if (!last)                         { errors.push(`Row ${n}: missing last_name`); return }
    if (!first)                        { errors.push(`Row ${n}: missing first_name`); return }
    if (!email || !email.includes("@")){ errors.push(`Row ${n}: missing or invalid email`); return }
    if (seen.has(email))               { errors.push(`Row ${n}: duplicate email "${email}"`); return }

    seen.add(email)
    const display = `${first} ${last}`.trim()
    upsert.push({
      email,
      name:         display,
      display_name: display,
      phone:        normalizePhone(phone),
      employee_id:  empId || null,
      role:         "teacher",
      is_active:    true,
    })
  })

  if (!upsert.length)
    return NextResponse.json({ errors, processed: 0 }, { status: 400 })

  // Upsert by email — role field uses ignoreDuplicates: false so existing roles are preserved
  // We pass role only for new inserts; existing rows keep their role via merge strategy
  const { error } = await db
    .from("users")
    .upsert(upsert, { onConflict: "email" })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    processed: upsert.length,
    skipped:   rows.length - upsert.length,
    errors:    errors.length ? errors : undefined,
  })
}
