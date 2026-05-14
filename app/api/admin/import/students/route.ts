import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/supabase"
import { parseCSV, col, normalizePhone } from "@/lib/csvParser"

/**
 * Accepts the exact Veracross export columns (case-insensitive, CSV or TSV):
 *   Required : Person ID, Last Name, Preferred Name, Current Grade
 *   Optional : Gender, Email 1, Mobile Phone, Advisor
 *
 * Also accepts legacy/alternative column names for compatibility.
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
    const n = i + 2 // human row number (1-indexed + header)

    // --- Required fields ---
    const sid = col(row,
      "person_id",                          // Veracross: "Person ID"
      "student_id", "veracross_id", "vc_id", "id", "id_number", "studentid",
    )
    const last = col(row,
      "last_name",                           // Veracross: "Last Name"
      "lastname", "last", "surname",
    )
    // Veracross exports "Preferred Name" as the student's first/display name
    const preferred = col(row,
      "preferred_name",                      // Veracross: "Preferred Name"
      "call_by", "callby", "preferred", "nickname",
      "first_name", "firstname", "first",
    )

    // --- Grade: handles "Grade 9", "9th Grade", "9", etc. ---
    const gradeRaw = col(row,
      "current_grade",                       // Veracross: "Current Grade"
      "grade", "grade_level", "gradelevel", "year", "grad_year",
    )

    // --- Optional fields ---
    const phone = col(row,
      "mobile_phone",                        // Veracross: "Mobile Phone"
      "phone", "cell", "cell_phone", "cellphone", "mobile", "student_cell",
    )
    const email = col(row,
      "email_1",                             // Veracross: "Email 1"
      "email", "student_email", "school_email",
    )
    const advisor = col(row,
      "advisor",                             // Veracross: "Advisor"
      "advisor_name", "homeroom", "advisory",
    )
    const gender = col(row,
      "gender",                              // Veracross: "Gender"
      "sex",
    )

    if (!sid)  { errors.push(`Row ${n}: missing Person ID`); return }
    if (!last) { errors.push(`Row ${n}: missing Last Name`);  return }
    if (seen.has(sid)) { errors.push(`Row ${n}: duplicate Person ID "${sid}"`); return }

    // Grade: strip non-digits ("Grade 9" → "9"), then parse
    let grade = 9
    if (gradeRaw) {
      const digits = gradeRaw.replace(/\D+/g, "")
      const g = parseInt(digits, 10)
      if (isNaN(g) || g < 9 || g > 12) {
        errors.push(`Row ${n}: invalid grade "${gradeRaw}" (must be 9–12)`); return
      }
      grade = g
    } else {
      warnings.push(`Row ${n} (${sid}): grade missing — defaulted to 9`)
    }

    const firstName = preferred || last  // fallback to last if truly nothing

    seen.add(sid)
    upsert.push({
      veracross_id: sid,
      last_name:    last,
      first_name:   firstName,
      call_by:      preferred || firstName,
      grade,
      phone:        normalizePhone(phone),
      email:        email.toLowerCase() || null,
      advisor_name: advisor || null,
      gender:       gender  || null,
      is_active:    true,
      role:         "student",
      roles:        ["student"],
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
