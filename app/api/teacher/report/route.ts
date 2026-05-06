import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/supabase"
import { getCurrentPeriod, isFirstBlockOfDay } from "@/lib/schedule"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !["teacher", "admin", "super_admin"].includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { student_id, block_number, course_id } = await req.json()
  if (!student_id || !block_number)
    return NextResponse.json({ error: "student_id and block_number required" }, { status: 400 })

  const today      = new Date().toISOString().split("T")[0]
  const todayStart = today + "T00:00:00+00:00"
  const todayEnd   = today + "T23:59:59+00:00"

  // Deduplication: same student + same block + open today
  const { data: existing } = await db
    .from("incidents")
    .select("id, level, status")
    .eq("student_id", student_id)
    .eq("block_id", block_number)
    .eq("status", "open")
    .gte("reported_at", todayStart)
    .lte("reported_at", todayEnd)
    .limit(1)

  if (existing && existing.length > 0)
    return NextResponse.json({ duplicate: true, incident: existing[0] }, { status: 200 })

  // Block 1 suppression
  const period = await getCurrentPeriod()
  const suppressEmail =
    period.isSchoolDay && period.dayType !== null
      ? isFirstBlockOfDay(period.dayType, Number(block_number))
      : false

  // Get room from course
  let room: string | null = null
  if (course_id) {
    const { data: c } = await db.from("courses").select("room").eq("id", course_id).single()
    room = c?.room ?? null
  }

  // Create incident — use enum values that exist in schema
  const { data: incident, error } = await db.from("incidents").insert({
    student_id,
    reported_by:         session.user.userId,
    period_type:         "block",           // valid: block | lunch | community
    report_type:         "absent_from_start", // valid enum value
    level:               "routine",
    block_id:            Number(block_number),
    course_id:           course_id || null,
    room,
    suppress_email_home: suppressEmail,
    initiated_by:        "teacher",         // valid enum value
    status:              "open",
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(incident, { status: 201 })
}
