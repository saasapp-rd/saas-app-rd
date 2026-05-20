import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import Link from "next/link"
import FlagManager from "@/components/counselor/FlagManager"
import StudentSchedule from "@/components/admin/StudentSchedule"
import StudentProfileHeader from "@/components/admin/StudentProfileHeader"
import { analyzeSchedule } from "@/lib/scheduleAnalysis"

const ALLOWED       = ["coordinator","counselor","dean","admin","super_admin","teacher","staff"]
const FLAG_ALLOWED  = ["counselor","dean","admin","super_admin"]
const PHONE_ALLOWED = ["coordinator","counselor","dean","admin","super_admin"]
const EDIT_ALLOWED  = ["admin","super_admin"]
const ACK_ALLOWED   = ["coordinator","counselor","dean","admin","super_admin"]

const FLAG_STYLE: Record<string, { bg: string; color: string }> = {
  elevated:  { bg: "#FFF0F0", color: "#A6192E" },
  watch:     { bg: "#FFF8E0", color: "#8B6200" },
  emergency: { bg: "#FFE0E0", color: "#7B0000" },
}

const LEVEL_STYLE: Record<string, { bg: string; color: string }> = {
  routine:   { bg: "#EAEAEA",  color: "#3D3D3D" },
  elevated:  { bg: "#FFF0F0",  color: "#A6192E" },
  emergency: { bg: "#FFE0E0",  color: "#7B0000" },
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  open:     { bg: "#FFF8E0", color: "#8B6200", label: "Open"     },
  resolved: { bg: "#F0FDF4", color: "#166534", label: "Resolved" },
  located:  { bg: "#EEF6FF", color: "#1E5FA6", label: "Located"  },
}

interface IncidentRow {
  id:               string
  level:            string
  status:           string
  report_type:      string
  reported_at:      string
  resolved_at:      string | null
  block_id:         number | null
  located_location: string | null
  reporter:         { display_name: string } | null
}

interface FlagRow {
  id:          string
  flag_level:  string
  public_note: string | null
  flagged_at:  string
}

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!ALLOWED.includes(session.user.role)) redirect("/dashboard")

  // Students live in the users table post-migration 011 — the legacy
  // students table doesn't exist on this instance. Map veracross_id →
  // student_id so downstream rendering stays uniform.
  const [stuResult, flagResult, incResult, enrollResult, allCoursesResult] = await Promise.all([
    db.from("users")
      .select("id, first_name, last_name, call_by, grade, veracross_id, parent_email, parent_name, phone, schedule_acknowledged")
      .eq("id", id)
      .maybeSingle(),
    db.from("student_concern_flags")
      .select("id, flag_level, public_note, flagged_at")
      .eq("student_id", id)
      .order("flagged_at", { ascending: false }),
    db.from("incidents")
      .select("id, level, status, report_type, reported_at, resolved_at, block_id, located_location, reporter:reported_by(display_name)")
      .eq("student_id", id)
      .order("reported_at", { ascending: false })
      .limit(50),
    db.from("student_enrollments")
      .select("course_id, block_number")
      .eq("student_id", id)
      .order("block_number"),
    db.from("courses")
      .select("id, name, block_number, room, teacher_id")
      .eq("is_active", true)
      .order("block_number")
      .order("name")
      .range(0, 9999),
  ])

  if (stuResult.error) console.error("[students/[id]] users lookup error:", stuResult.error.message)
  if (!stuResult.data) notFound()

  const stuRaw = stuResult.data as {
    id: string; first_name: string | null; last_name: string | null
    call_by: string | null
    grade: number | null; veracross_id: string | null
    parent_email: string | null; parent_name: string | null
    phone: string | null; schedule_acknowledged: boolean | null
  }
  const stu = {
    id:           stuRaw.id,
    first_name:   stuRaw.first_name,
    last_name:    stuRaw.last_name,
    call_by:      stuRaw.call_by,
    grade:        stuRaw.grade,
    student_id:   stuRaw.veracross_id,
    veracross_id: stuRaw.veracross_id,
    parent_email: stuRaw.parent_email,
    parent_name:  stuRaw.parent_name,
    phone:        stuRaw.phone,
    schedule_acknowledged: !!stuRaw.schedule_acknowledged,
  }
  const flags     = (flagResult.data ?? []) as FlagRow[]
  const incidents = (incResult.data ?? []) as unknown as IncidentRow[]

  // Build a course lookup (for both the student's enrollments and the
  // "add a class" picker). All active courses come from allCoursesResult.
  const allCoursesData = (allCoursesResult.data ?? []) as {
    id: string; name: string; block_number: number | null; room: string | null; teacher_id: string | null
  }[]
  const teacherIds = [...new Set(allCoursesData.map(c => c.teacher_id).filter((t): t is string => !!t))]
  const { data: teachers } = teacherIds.length
    ? await db.from("users").select("id, display_name").in("id", teacherIds).range(0, 9999)
    : { data: [] }
  const teacherMap = new Map(((teachers ?? []) as { id: string; display_name: string | null }[])
    .map(t => [t.id, t.display_name]))

  type CourseOption = {
    courseId: string; blockNumber: number | null; courseName: string
    room: string | null; teacherId: string | null; teacherName: string | null
  }
  const allCourses: CourseOption[] = allCoursesData.map(c => ({
    courseId:    c.id,
    blockNumber: c.block_number,
    courseName:  c.name,
    room:        c.room,
    teacherId:   c.teacher_id,
    teacherName: c.teacher_id ? (teacherMap.get(c.teacher_id) ?? null) : null,
  }))
  const courseByIdForEnrollment = new Map(allCourses.map(c => [c.courseId, c]))

  // Student's actual enrollments
  const rawEnroll = enrollResult.data ?? []
  const enrollments = rawEnroll
    .map(e => courseByIdForEnrollment.get(e.course_id as string) ?? null)
    .filter((c): c is CourseOption => c !== null)
    .filter(c => c.blockNumber !== null)
    .map(c => ({
      courseId:    c.courseId,
      blockNumber: c.blockNumber as number,
      courseName:  c.courseName,
      room:        c.room,
      teacherId:   c.teacherId,
      teacherName: c.teacherName,
    }))
    .sort((a, b) => a.blockNumber - b.blockNumber)

  const canEdit         = ["admin","super_admin","coordinator","counselor","dean"].includes(session.user.role)
  const canSeePhone     = PHONE_ALLOWED.includes(session.user.role)
  const canEditProfile  = EDIT_ALLOWED.includes(session.user.role)
  const canAckSchedule  = ACK_ALLOWED.includes(session.user.role)

  // Surface the "known-OK variant" affordance only when there's actually
  // a schedule issue to acknowledge. Computed server-side so the page
  // ships the right initial state without a client round-trip.
  const scheduleEnrollmentsForAnalyze = enrollments.map(e => ({
    block:       e.blockNumber as number | null,
    courseName:  e.courseName,
    room:        e.room,
    teacherName: e.teacherName,
    isAdvisory:  e.blockNumber === 9,
  }))
  const scheduleStatus = analyzeSchedule(scheduleEnrollmentsForAnalyze)

  const canManageFlags = FLAG_ALLOWED.includes(session.user.role)
  const now            = Date.now()
  const thirtyDays     = incidents.filter(i => (now - new Date(i.reported_at).getTime()) < 30 * 86400000)
  const elevCount      = incidents.filter(i => i.level === "elevated").length

  function duration(inc: IncidentRow): string {
    if (!inc.resolved_at) return "—"
    const ms = new Date(inc.resolved_at).getTime() - new Date(inc.reported_at).getTime()
    const m  = Math.round(ms / 60000)
    return m < 1 ? "<1m" : m + "m"
  }

  function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between"
              style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">Student Profile</div>
          <div className="text-white text-[10px] opacity-70">
            {stu.last_name}, {stu.first_name} &middot; Grade {stu.grade}
          </div>
        </div>
        <SignOutButton />
      </header>

      <nav className="px-5 py-2 border-b flex items-center gap-4" style={{ borderColor: "#EAEAEA" }}>
        <Link href="/admin/users/student"
              className="text-xs font-bold"
              style={{ color: "#A6192E", textDecoration: "none" }}>
          &larr; Back
        </Link>
        <Link href="/missing" className="text-xs" style={{ color: "#999", textDecoration: "none" }}>
          All Missing
        </Link>
      </nav>

      <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full flex flex-col gap-5">

        {/* Student info — client component so edit modal + ack toggle work */}
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
            schedule_acknowledged: stu.schedule_acknowledged,
          }}
          topFlag={flags[0] ? { level: flags[0].flag_level } : null}
          hasScheduleIssues={scheduleStatus.hasIssues}
          canSeePhone={canSeePhone}
          canEditProfile={canEditProfile}
          canAckSchedule={canAckSchedule}
        />

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl p-3 text-center" style={{ background: "#F7F7F7" }}>
            <div className="text-2xl font-black" style={{ color: "#A6192E" }}>{incidents.length}</div>
            <div className="text-[9px] font-bold uppercase tracking-wide opacity-50">Total</div>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: "#F7F7F7" }}>
            <div className="text-2xl font-black" style={{ color: "#A6192E" }}>{thirtyDays.length}</div>
            <div className="text-[9px] font-bold uppercase tracking-wide opacity-50">Last 30d</div>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: "#F7F7F7" }}>
            <div className="text-2xl font-black"
                 style={{ color: elevCount > 0 ? "#CE2033" : "#A6192E" }}>
              {elevCount}
            </div>
            <div className="text-[9px] font-bold uppercase tracking-wide opacity-50">Elevated</div>
          </div>
        </div>

        {/* Schedule */}
        <div id="schedule" style={{ scrollMarginTop: 80 }}>
          <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
             style={{ color: "#3D3D3D", opacity: 0.35 }}>
            Schedule &mdash; {enrollments.length} {enrollments.length === 1 ? "class" : "classes"}
          </p>
          <StudentSchedule
            studentId={stu.id}
            initialEnrollments={enrollments}
            allCourses={allCourses}
            canEdit={canEdit}
          />
        </div>

        {/* Concern flags */}
        <div>
          <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
             style={{ color: "#3D3D3D", opacity: 0.35 }}>
            Concern Flags {flags.length > 0 ? "— " + flags.length : ""}
          </p>
          {canManageFlags ? (
            <FlagManager studentId={stu.id} initialFlags={flags} />
          ) : (
            flags.length === 0 ? (
              <p className="text-xs py-3 text-center" style={{ color: "#999" }}>No flags on record.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {flags.map(f => (
                  <div key={f.id} className="rounded-xl px-4 py-2.5 border flex items-start justify-between"
                       style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
                    <div>
                      {f.public_note && (
                        <p className="text-xs" style={{ color: "#3D3D3D" }}>{f.public_note}</p>
                      )}
                      <p className="text-[10px]" style={{ color: "#999" }}>{fmtDate(f.flagged_at)}</p>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase"
                          style={{
                            background: FLAG_STYLE[f.flag_level]?.bg ?? "#EAEAEA",
                            color:      FLAG_STYLE[f.flag_level]?.color ?? "#666",
                          }}>
                      {f.flag_level}
                    </span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Incident history — anchor target for "See Missing Data" links */}
        <div id="incidents" style={{ scrollMarginTop: 80 }}>
          <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
             style={{ color: "#3D3D3D", opacity: 0.35 }}>
            Incident History &mdash; {incidents.length}
          </p>
          {incidents.length === 0 && (
            <p className="text-xs text-center py-6" style={{ color: "#999" }}>No incidents on record.</p>
          )}
          <div className="flex flex-col gap-1.5">
            {incidents.map(inc => {
              const lvl = LEVEL_STYLE[inc.level]  ?? LEVEL_STYLE["routine"]
              const sta = STATUS_STYLE[inc.status] ?? STATUS_STYLE["open"]
              return (
                <Link key={inc.id} href={"/coordinator/" + inc.id} style={{ textDecoration: "none" }}>
                  <div className="rounded-xl px-4 py-3 border flex items-center gap-3"
                       style={{
                         background:  inc.level === "elevated" ? "#FFF8F8" : "#FAFAFA",
                         borderColor: inc.level === "elevated" ? "#FFCCCC" : "#EAEAEA",
                         borderLeft:  "3px solid " + (inc.level === "elevated" ? "#CE2033" : "#F0C040"),
                       }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                              style={{ background: lvl.bg, color: lvl.color }}>{inc.level}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                              style={{ background: sta.bg, color: sta.color }}>{sta.label}</span>
                      </div>
                      <p className="text-[10px]" style={{ color: "#999" }}>
                        {fmtDate(inc.reported_at)}
                        {inc.block_id ? " · Block " + inc.block_id : ""}
                        {inc.reporter ? " · " + (inc.reporter as any).display_name : ""}
                        {inc.located_location ? " · " + inc.located_location : ""}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[10px] font-bold" style={{ color: "#999" }}>{duration(inc)}</p>
                      <p className="text-[9px]" style={{ color: "#BABABA" }}>&rarr;</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
