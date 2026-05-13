import { Resend } from "resend"
import { db } from "./supabase"

const resend = new Resend(process.env.RESEND_API_KEY)

type StudentJoin = {
  first_name:   string
  last_name:    string
  grade:        number
  parent_email: string | null
  parent_name:  string | null
}

function normJoin<T>(val: unknown): T | null {
  if (!val) return null
  return (Array.isArray(val) ? val[0] ?? null : val) as T | null
}

export async function sendEmailHome(incidentId: string): Promise<void> {
  const { data: inc } = await db
    .from("incidents")
    .select(`
      id, block_id, reported_at, suppress_email_home,
      student:student_id(first_name, last_name, grade, parent_email, parent_name),
      reporter:reported_by(display_name)
    `)
    .eq("id", incidentId)
    .single()

  if (!inc) return
  if (inc.suppress_email_home) return

  const student  = normJoin<StudentJoin>((inc as any).student)
  const reporter = normJoin<{ display_name: string }>((inc as any).reporter)

  if (!student?.parent_email) return

  const name     = student.first_name + " " + student.last_name
  const greeting = student.parent_name ? "Dear " + student.parent_name + "," : "Dear Parent/Guardian,"
  const time     = new Date(inc.reported_at).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles",
  })

  const { error } = await resend.emails.send({
    from:    process.env.RESEND_FROM ?? "onboarding@resend.dev",
    to:      [student.parent_email],
    subject: "Attendance Notice - " + name,
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px">
        <div style="background:#A6192E;padding:16px 20px;border-radius:8px 8px 0 0">
          <h2 style="color:#fff;margin:0;font-size:16px;font-weight:700;letter-spacing:0.05em">
            SEATTLE ACADEMY - ATTENDANCE NOTICE
          </h2>
        </div>
        <div style="border:1px solid #EAEAEA;border-top:none;padding:20px;border-radius:0 0 8px 8px">
          <p style="margin:0 0 12px">${greeting}</p>
          <p style="margin:0 0 12px">
            <strong>${name}</strong> (Grade ${student.grade}) was reported not present
            in <strong>Block ${inc.block_id ?? "?"}</strong> at ${time} by
            ${reporter?.display_name ?? "a staff member"}.
          </p>
          <p style="margin:0 0 12px">
            Our attendance coordinator has been notified and is following up now.
            You will receive another message once your student is located.
          </p>
          <p style="margin:0 0 4px;font-size:12px;color:#999">
            Seattle Academy of Arts &amp; Sciences
          </p>
          <p style="margin:0;font-size:12px;color:#999">
            This is an automated attendance notification. Please do not reply to this email.
          </p>
        </div>
      </div>
    `,
  })

  if (error) console.error("[email] sendEmailHome error:", error)
}
