import { NextRequest, NextResponse }           from "next/server"
import { getServerSession }                    from "next-auth"
import { authOptions }                         from "@/lib/auth"
import { db }                                  from "@/lib/supabase"
import { getCurrentPeriod }                    from "@/lib/schedule"
import { sendPushToRole }                      from "@/lib/push"

const ALLOWED = ["staff", "teacher", "coordinator", "counselor", "dean", "admin", "super_admin"]

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !ALLOWED.includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { student_id, note } = await req.json()
  if (!student_id)
    return NextResponse.json({ error: "student_id required" }, { status: 400 })

  // Get current block (if in a block period)
  const period   = await getCurrentPeriod()
  const block_id = (period as any).currentBlock ?? null

  const { data: incident, error } = await db.from("incidents").insert({
    student_id,
    reported_by:         session.user.userId,
    period_type:         block_id ? "block" : "community",
    report_type:         "welfare_concern",
    initiated_by:        "welfare_concern",
    level:               "elevated",           // welfare concerns go straight to elevated
    block_id,
    suppress_email_home: false,
    status:              "open",
  }).select("id, block_id, students(first_name, last_name)").single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Push to coordinators immediately (fire-and-forget)
  const student  = incident?.students as { first_name: string; last_name: string } | null
  const fullName = student ? student.last_name + ", " + student.first_name : "Student"
  sendPushToRole("coordinator", {
    title: "Welfare Concern Reported",
    body:  fullName + " — reported by " + session.user.displayName,
    url:   "/coordinator",
  }).catch(() => {})

  return NextResponse.json(incident, { status: 201 })
}
