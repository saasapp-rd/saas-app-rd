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
  if (!session || session.user.role !== "super_admin")
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

  // Lookup existing students by veracross_id — avoids needing a unique constraint
  // on veracross_id for an ON CONFLICT upsert.
  const vcIds = upsert.map(u => (u as { veracross_id: string }).veracross_id)
  const { data: existingRows } = await db
    .from("users")
    .select("id, veracross_id")
    .eq("role", "student")
    .in("veracross_id", vcIds)

  const idByVcId = new Map(
    (existingRows ?? []).map(r => [r.veracross_id as string, r.id as string])
  )

  const inserts: object[] = []
  const updates: { id: string; rec: object }[] = []
  for (const rec of upsert) {
    const vcId       = (rec as { veracross_id: string }).veracross_id
    const existingId = idByVcId.get(vcId)
    if (existingId) updates.push({ id: existingId, rec })
    else            inserts.push(rec)
  }

  let dbError: string | undefined

  for (let i = 0; i < inserts.length && !dbError; i += 200) {
    const { error } = await db.from("users").insert(inserts.slice(i, i + 200))
    if (error) dbError = error.message
  }

  if (!dbError && updates.length) {
    const results = await Promise.allSettled(
      updates.map(u => db.from("users").update(u.rec).eq("id", u.id))
    )
    const failed = results.find(r =>
      r.status === "rejected" ||
      (r.status === "fulfilled" && (r.value as { error: { message: string } | null }).error)
    )
    if (failed) {
      dbError = failed.status === "fulfilled"
        ? (failed.value as { error: { message: string } | null }).error?.message
        : "Update failed"
    }
  }

  if (dbError) return NextResponse.json({ error: dbError }, { status: 500 })

  return NextResponse.json({
    processed: upsert.length,
    skipped:   rows.length - upsert.length,
    warnings:  warnings.length ? warnings : undefined,
    errors:    errors.length   ? errors   : undefined,
  })
}
