import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/supabase"
import { fetchAllPaginated } from "@/lib/dbHelpers"
import SignOutButton from "@/components/SignOutButton"
import Link from "next/link"
import IncidentDrilldown, { type IncidentRow } from "@/components/admin/IncidentDrilldown"
import StudentProfileHeader from "@/components/admin/StudentProfileHeader"
import { analyzeSchedule } from "@/lib/scheduleAnalysis"

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

      <nav className="px-5 py-2 border-b flex items-center gap-4" style={{ borderColor: "#EAEAEA" }}>
        <Link href={`/students/${id}`}
              className="text-xs font-bold"
              style={{ color: "#A6192E", textDecoration: "none" }}>
          &larr; Schedule
        </Link>
      </nav>

      <main className="flex-1 px-5 py-5 max-w-2xl mx-auto w-full flex flex-col gap-5">

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
      </main>
    </div>
  )
}
