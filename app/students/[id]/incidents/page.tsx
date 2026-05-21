import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/supabase"
import { fetchAllPaginated } from "@/lib/dbHelpers"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import BackLink from "@/components/BackLink"
import Link from "next/link"
import IncidentDrilldown, { type IncidentRow } from "@/components/admin/IncidentDrilldown"
import StudentProfileHeader from "@/components/admin/StudentProfileHeader"
import { analyzeSchedule } from "@/lib/scheduleAnalysis"
import { fmtTimePacific } from "@/lib/time"

export const dynamic = "force-dynamic"

const ALLOWED       = ["coordinator","counselor","dean","admin","super_admin"]
const DELETE_ROLES  = ["admin","super_admin"]
const PHONE_ALLOWED = ["coordinator","counselor","dean","admin","super_admin"]
const EDIT_ALLOWED  = ["admin","super_admin"]

export default async function StudentIncidentsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!ALLOWED.includes(session.user.role)) redirect("/dashboard")

  // Student row + concern flags + enrollments (for the schedule-issues
  // check on the variant-ack button) + every incident. All in parallel.
  const [
    { data: stuRow },
    { data: flagRows },
    { data: enrollRows },
    incidents,
    { data: checkInRows },
  ] = await Promise.all([
    db.from("users")
      .select("id, first_name, last_name, call_by, grade, veracross_id, parent_email, parent_name, phone, schedule_acknowledged")
      .eq("id", id)
      .maybeSingle(),
    db.from("student_concern_flags")
      .select("flag_level")
      .eq("student_id", id)
      .order("flagged_at", { ascending: false })
      .limit(1),
    db.from("student_enrollments")
      .select("course_id, block_number")
      .eq("student_id", id),
    // Welfare concerns included so admin can audit/delete them too.
    fetchAllPaginated<IncidentRow>(() =>
      db.from("incidents")
        .select("id, level, status, report_type, reported_at, resolved_at, located_location, located_excused, block_id, reporter:reported_by(display_name)")
        .eq("student_id", id)
        .order("reported_at", { ascending: false })
    ),
    db.from("student_check_ins")
      .select("id, location_category, claimed_at, expires_at, released_at, released_reason, notes, staff:staff_id(display_name)")
      .eq("student_id", id)
      .order("claimed_at", { ascending: false })
      .limit(50),
  ])
  if (!stuRow) notFound()

  const stu = stuRow as {
    id: string; first_name: string | null; last_name: string | null
    call_by: string | null; grade: number | null; veracross_id: string | null
    parent_email: string | null; parent_name: string | null
    phone: string | null; schedule_acknowledged: boolean | null
  }

  // Compute schedule issues so the Variant-OK toggle on the header
  // surfaces correctly. The block_number on the enrollment row is what
  // we care about for completeness checks.
  const scheduleStatus = analyzeSchedule(
    (enrollRows ?? []).map(e => ({
      block:       (e.block_number as number | null) ?? null,
      courseName:  "",
      room:        null,
      teacherName: null,
      isAdvisory:  (e.block_number as number | null) === 9,
    }))
  )

  type CheckInRow = {
    id: string; location_category: string; claimed_at: string
    expires_at: string; released_at: string | null
    released_reason: string | null; notes: string | null
    staff: { display_name: string } | { display_name: string }[] | null
  }
  const SENSITIVE_CATS = ["accommodations","nurse","counselor_office","other_sensitive"]
  const PRIVILEGED_CI  = ["coordinator","dean","admin","super_admin"]
  const CATEGORY_LABEL: Record<string, string> = {
    classroom:        "Classroom",
    library:          "Library",
    advisory:         "Advisory",
    study_hall:       "Study Hall",
    gym:              "Gym",
    hallway:          "Hallway",
    office_misc:      "Office / Misc",
    accommodations:   "Accommodations",
    nurse:            "Health Office",
    counselor_office: "Counselor's Office",
    other_sensitive:  "Other (Sensitive)",
  }
  const checkIns = ((checkInRows ?? []) as unknown as CheckInRow[]).filter(row => {
    if (!SENSITIVE_CATS.includes(row.location_category)) return true
    if (PRIVILEGED_CI.includes(session.user.role))       return true
    if (session.user.role === "counselor" && row.location_category === "counselor_office") return true
    return false
  })

  const topFlag = ((flagRows ?? [])[0] as { flag_level: string } | undefined) ?? null
  const canDelete       = DELETE_ROLES.includes(session.user.role)
  const canSeePhone     = PHONE_ALLOWED.includes(session.user.role)
  const canEditProfile  = EDIT_ALLOWED.includes(session.user.role)
  // The schedule-ack button doesn't belong on the incidents page (it's a
  // schedule-management action). The badge still shows when relevant, but
  // toggling lives on the schedule page.
  const canAckSchedule  = false

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between"
              style={{ background: "#A6192E" }}>
        <div className="min-w-0">
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">Missing Student Data</div>
          <div className="text-white text-[10px] opacity-70 truncate">
            {stu.last_name}, {stu.first_name}
          </div>
        </div>
        <SignOutButton />
      </header>
      <TestModeBanner role={session.user.role} />

      <nav className="px-5 py-2 border-b flex items-center gap-4" style={{ borderColor: "#EAEAEA" }}>
        <BackLink fallbackHref={`/students/${id}`} />
      </nav>

      <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full flex flex-col gap-5">

        {/* Student profile card — same as schedule page, for context. */}
        <StudentProfileHeader
          student={{
            id:           stu.id,
            first_name:   stu.first_name,
            last_name:    stu.last_name,
            call_by:      stu.call_by,
            grade:        stu.grade,
            veracross_id: stu.veracross_id,
            parent_email: stu.parent_email,
            phone:        stu.phone,
            schedule_acknowledged: !!stu.schedule_acknowledged,
          }}
          topFlag={topFlag ? { level: topFlag.flag_level } : null}
          hasScheduleIssues={scheduleStatus.hasIssues}
          canSeePhone={canSeePhone}
          canEditProfile={canEditProfile}
          canAckSchedule={canAckSchedule}
        />

        <IncidentDrilldown
          studentId={id}
          studentName={`${stu.last_name ?? ""}, ${stu.first_name ?? ""}`}
          incidents={incidents}
          canDelete={canDelete}
        />

        {/* ── Check-in History ── */}
        <div>
          <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
             style={{ color: "#3D3D3D", opacity: 0.35 }}>
            Check-in History — {checkIns.length}
          </p>
          {checkIns.length === 0 ? (
            <p className="text-xs py-4 text-center" style={{ color: "#999" }}>
              No check-ins recorded for this student.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {checkIns.map(ci => {
                const stf      = Array.isArray(ci.staff) ? ci.staff[0] : ci.staff
                const nowMs    = Date.now()
                const isActive = !ci.released_at && new Date(ci.expires_at).getTime() > nowMs
                const isExpired= !ci.released_at && new Date(ci.expires_at).getTime() <= nowMs
                return (
                  <div key={ci.id} className="rounded-xl px-4 py-3 border"
                       style={{
                         background:  isActive ? "#F0FDF4" : "#FAFAFA",
                         borderColor: isActive ? "#22C55E" : "#EAEAEA",
                       }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold" style={{ color: "#3D3D3D" }}>
                            {CATEGORY_LABEL[ci.location_category] ?? ci.location_category}
                          </span>
                          {isActive && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                                  style={{ background: "#DCFCE7", color: "#166534" }}>
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] mt-0.5" style={{ color: "#999" }}>
                          {(stf as any)?.display_name ?? "Staff"} · {fmtTimePacific(ci.claimed_at)}
                        </p>
                        {ci.notes && (
                          <p className="text-[10px] mt-0.5 italic" style={{ color: "#888" }}>
                            {ci.notes}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0 pt-0.5">
                        <span className="text-[9px]" style={{ color: "#BABABA" }}>
                          {ci.released_at
                            ? ci.released_reason === "manual"     ? "Released"
                            : ci.released_reason === "superseded" ? "Superseded"
                            :                                       "Closed"
                            : isExpired ? "Expired" : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
