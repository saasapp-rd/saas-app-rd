import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/supabase"
import { parseCSV, col, normalizePhone } from "@/lib/csvParser"

/**
 * Accepts the exact Veracross faculty/staff export (CSV):
 *   Person ID, Primary School Level, Last Name, Preferred Name,
 *   Job Title, Email 1, Business Phone, Mobile Phone, Role
 *
 * Role mapping:
 *   "Faculty" → teacher
 *   "Staff"   → staff
 *   (anything else / missing) → staff
 *
 * Existing users whose role is coordinator, counselor, dean, admin, or
 * super_admin are never downgraded — their role is preserved on re-import.
 *
 * Matched and upserted by email (Email 1).
 */

const PRESERVE_ROLES = ["super_admin", "admin", "dean", "coordinator", "counselor"]

function mapRole(vcRole: string): string {
  const r = vcRole.trim().toLowerCase()
  if (r === "faculty") return "teacher"
  return "staff"
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

  const errors: string[] = []
  const seen  = new Set<string>()

  // --- Parse rows ---
  const parsed: {
    email:       string
    last:        string
    preferred:   string
    vcRole:      string
    veracrossId: string
    jobTitle:    string
    phone:       string | null
  }[] = []

  rows.forEach((row, i) => {
    const n         = i + 2
    const email     = col(row, "email_1", "email", "email_address", "work_email", "school_email").toLowerCase()
    const last      = col(row, "last_name", "lastname", "last", "surname")
    const preferred = col(row, "preferred_name", "first_name", "firstname", "first", "given_name")
    const vcRole    = col(row, "role")
    const vcId      = col(row, "person_id", "employee_id", "employeeid", "staff_id")
    const jobTitle  = col(row, "job_title", "jobtitle", "title", "position")
    // Prefer mobile; fall back to business phone
    const phone     = col(row, "mobile_phone", "business_phone", "phone", "cell", "mobile")

    if (!email || !email.includes("@")) { errors.push(`Row ${n}: missing or invalid email`); return }
    if (!last)                          { errors.push(`Row ${n}: missing Last Name`);        return }
    if (seen.has(email))                { errors.push(`Row ${n}: duplicate email "${email}"`); return }

    seen.add(email)
    parsed.push({ email, last, preferred, vcRole, veracrossId: vcId, jobTitle, phone: normalizePhone(phone) })
  })

  if (!parsed.length)
    return NextResponse.json({ errors, processed: 0 }, { status: 400 })

  // --- Fetch existing users to preserve elevated roles ---
  const emails = parsed.map(p => p.email)
  const { data: existing } = await db
    .from("users")
    .select("email, role")
    .in("email", emails)

  const existingRole = new Map((existing ?? []).map(u => [u.email, u.role as string]))

  // --- Build upsert records ---
  const upsert = parsed.map(p => {
    const current    = existingRole.get(p.email)
    const finalRole  = current && PRESERVE_ROLES.includes(current)
      ? current
      : mapRole(p.vcRole)

    const display = [p.preferred, p.last].filter(Boolean).join(" ")

    return {
      email:        p.email,
      name:         display,
      display_name: display,
      first_name:   p.preferred || null,
      last_name:    p.last,
      phone:        p.phone,
      veracross_id: p.veracrossId || null,
      role:         finalRole,
      roles:        [finalRole],
      is_active:    true,
      // job_title intentionally omitted — requires migration 015_faculty_fields.sql.
      // Once that migration is run in Supabase, add it back: job_title: p.jobTitle || null
    }
  })

  const { error } = await db
    .from("users")
    .upsert(upsert, { onConflict: "email" })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const teacherCount = upsert.filter(u => u.role === "teacher").length
  const staffCount   = upsert.filter(u => u.role === "staff").length
  const preserved    = upsert.filter(u => PRESERVE_ROLES.includes(u.role)).length

  return NextResponse.json({
    processed: upsert.length,
    teachers:  teacherCount,
    staff:     staffCount,
    preserved: preserved || undefined,
    skipped:   rows.length - upsert.length,
    errors:    errors.length ? errors : undefined,
  })
}
