import { NextRequest, NextResponse }           from "next/server"
import { getServerSession }                    from "next-auth"
import { authOptions }                         from "@/lib/auth"
import { db }                                  from "@/lib/supabase"
import { getCurrentPeriod, isFirstBlockOfDay } from "@/lib/schedule"
import { sendPushToRole }                      from "@/lib/push"

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

  // Pre-emption: active check-in for this student?
  const now = new Date().toISOString()
  const { data: activeCI } = await db
    .from("student_check_ins")
    .select("id, staff:staff_id(display_name)")
    .eq("student_id", student_id)
    .is("released_at", null)
    .gt("expires_at", now)
    .limit(1)
  const preEmpted   = !!(activeCI && activeCI.length > 0)
  const ciStaffRaw  = preEmpted ? (Array.isArray(activeCI![0].staff) ? activeCI![0].staff[0] : activeCI![0].staff) : null
  const ciStaffName = (ciStaffRaw as any)?.display_name ?? "Staff"

  // Block 1 suppression
  const period = await getCurrentPeriod()
  const suppressEmail =
    period.isSchoolDay && period.dayType !== null
      ? isFirstBlockOfDay(period.dayType, Number(block_number))
      : false

  // Room from course
  let room: string | null = null
  if (course_id) {
    const { data: c } = await db.from("courses").select("room").eq("id", course_id).single()
    room = c?.room ?? null
  }

  const { data: incident, error } = await db.from("incidents").insert({
    student_id,
    reported_by:         session.user.userId,
    period_type:         "block",
    report_type:         "absent_from_start",
    level:               "routine",
    block_id:            Number(block_number),
    course_id:           course_id || null,
    room,
    suppress_email_home: suppressEmail,
    initiated_by:        "teacher",
    status:              preEmpted ? "located" : "open",
    pre_empted_at:       preEmpted ? now : null,
  }).select("id, block_id, student:student_id(first_name, last_name)").single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Supabase returns joins as arrays — normalise to single object | null
  const rawStudent = (incident as any).student
  const student = Array.isArray(rawStudent)
    ? (rawStudent[0] as { first_name: string; last_name: string } | undefined) ?? null
    : (rawStudent as { first_name: string; last_name: string } | null)
  const fullName = student ? student.last_name + ", " + student.first_name : "Student"

  if (!preEmpted) {
    sendPushToRole("coordinator", {
      title: "Missing Student Reported",
      body:  fullName + " — Block " + incident.block_id,
      url:   "/coordinator",
    }).catch(() => {})
  }

  return NextResponse.json(
    preEmpted ? { pre_empted: true, staff_name: ciStaffName, incident } : incident,
    { status: 201 }
  )
}
