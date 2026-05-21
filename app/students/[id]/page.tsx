import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import BackLink from "@/components/BackLink"
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
  const [stuResult, flagResult, enrollResult, allCoursesResult] = await Promise.all([
    db.from("users")
      .select("id, first_name, last_name, call_by, grade, veracross_id, parent_email, parent_name, phone, schedule_acknowledged")
      .eq("id", id)
      .maybeSingle(),
    db.from("student_concern_flags")
      .select("id, flag_level, public_note, flagged_at")
      .eq("student_id", id)
      .order("flagged_at", { ascending: false }),
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
  const flags = (flagResult.data ?? []) as FlagRow[]

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
      <TestModeBanner role={session.user.role} />

      <nav className="px-5 py-2 border-b flex items-center" style={{ borderColor: "#EAEAEA" }}>
        <BackLink fallbackHref="/admin/users/student" />
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

      </main>
    </div>
  )
}
