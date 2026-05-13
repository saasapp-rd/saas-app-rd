import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/supabase"
import { parseCSV, col, normalizePhone } from "@/lib/csvParser"

/**
 * Expected CSV columns (case-insensitive, spaces OK):
 *   Required : last_name, call_by (preferred/nickname), student_id (Veracross ID)
 *   Recommended: grade (9-12), phone
 *   Optional : first_name, parent_email, parent_name
 *
 * Missing grade defaults to 9 with a warning.
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
  const warnings: string[] = []
  const upsert: object[] = []
  const seen = new Set<string>()

  rows.forEach((row, i) => {
    const n        = i + 2 // human row number (1-indexed + header)
    const sid      = col(row, "student_id", "veracross_id", "vc_id", "id", "id_number", "studentid")
    const last     = col(row, "last_name", "lastname", "last", "surname")
    const callBy   = col(row, "call_by", "callby", "preferred_name", "preferred", "nickname",
                          "first_name", "firstname", "first")
    const phone    = col(row, "phone", "cell", "cell_phone", "cellphone", "mobile", "student_cell")
    const first    = col(row, "first_name", "firstname", "legal_first", "given_name") || callBy || last
    const gradeRaw = col(row, "grade", "grade_level", "gradelevel", "year", "grad_year")
    const pEmail   = col(row, "parent_email", "parentemail", "guardian_email", "family_email")
    const pName    = col(row, "parent_name", "parentname", "guardian_name", "parent_guardian")

    if (!sid)  { errors.push(`Row ${n}: missing student_id`); return }
    if (!last) { errors.push(`Row ${n}: missing last_name`);  return }
    if (seen.has(sid)) { errors.push(`Row ${n}: duplicate student_id "${sid}"`); return }

    let grade = 9
    if (gradeRaw) {
      const g = parseInt(gradeRaw)
      if (isNaN(g) || g < 9 || g > 12) {
        errors.push(`Row ${n}: invalid grade "${gradeRaw}" (must be 9–12)`); return
      }
      grade = g
    } else {
      warnings.push(`Row ${n} (${sid}): grade missing — defaulted to 9`)
    }

    seen.add(sid)
    upsert.push({
      veracross_id: sid,
      last_name:    last,
      first_name:   first,
      call_by:      callBy || first,
      grade,
      phone:        normalizePhone(phone),
      parent_email: pEmail || null,
      parent_name:  pName  || null,
      is_active:    true,
      role:         "student",
    })
  })

  if (!upsert.length)
    return NextResponse.json({ errors, warnings, processed: 0 }, { status: 400 })

  // Batch upsert in chunks of 200
  let dbError: string | undefined
  for (let i = 0; i < upsert.length; i += 200) {
    const { error } = await db
      .from("users")
      .upsert(upsert.slice(i, i + 200), { onConflict: "veracross_id" })
    if (error) { dbError = error.message; break }
  }
  if (dbError) return NextResponse.json({ error: dbError }, { status: 500 })

  return NextResponse.json({
    processed: upsert.length,
    skipped:   rows.length - upsert.length,
    warnings:  warnings.length ? warnings : undefined,
    errors:    errors.length   ? errors   : undefined,
  })
}
