import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !["teacher", "admin", "super_admin"].includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { student_id, block_number, course_id } = await req.json()
  if (!student_id || !block_number)
    return NextResponse.json({ error: "student_id and block_number required" }, { status: 400 })

  const today     = new Date().toISOString().split("T")[0]
  const now       = new Date().toISOString()
  const todayStart = `${today}T00:00:00+00:00`
  const todayEnd   = `${today}T23:59:59+00:00`

  // Check for open incident to resolve
  const { data: existing } = await db
    .from("incidents")
    .select("id")
    .eq("student_id", student_id)
    .eq("block_id", block_number)
    .eq("status", "open")
    .gte("reported_at", todayStart)
    .lte("reported_at", todayEnd)
    .limit(1)

  if (existing && existing.length > 0) {
    // Resolve the existing incident
    await db.from("incidents").update({
      status:           "resolved",
      located_by:       session.user.userId,
      located_location: "With teacher",
      located_excused:  true,
      located_at:       now,
      resolved_at:      now,
      resolved_by:      session.user.userId,
    }).eq("id", existing[0].id)
    return NextResponse.json({ resolved: true, incident_id: existing[0].id })
  }

  // No open incident — log as immediately-resolved "with me" report
  const { data, error } = await db.from("incidents").insert({
    student_id,
    reported_by:        session.user.userId,
    period_type:        "block",
    report_type:        "student_with_me",
    level:              "routine",
    block_id:           Number(block_number),
    course_id:          course_id || null,
    suppress_email_home: true,
    initiated_by:       "teacher",
    status:             "resolved",
    located_by:         session.user.userId,
    located_location:   "With teacher",
    located_excused:    true,
    located_at:         now,
    resolved_at:        now,
    resolved_by:        session.user.userId,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ logged: true, incident_id: data.id })
}
