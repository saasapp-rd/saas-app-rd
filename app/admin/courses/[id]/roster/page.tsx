import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import BackLink from "@/components/BackLink"
import TestModeBanner from "@/components/TestModeBanner"
import Link from "next/link"
import CourseRoster, { RosterStudent } from "@/components/admin/CourseRoster"

export const dynamic = "force-dynamic"

interface CourseRecord {
  id:           string
  name:         string
  block_number: number | null
  room:         string | null
  is_active:    boolean | null
  is_advisory:  boolean | null
  teacher_id:   string | null
  class_id:     string | null
  course_code:  string | null
}

export default async function CourseRosterPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!["admin", "super_admin"].includes(session.user.role)) redirect("/dashboard")

  const { id } = await params

  // Course, enrollments, and the full active-student list (for the "Add
  // student" picker) — fetched in parallel.
  const [courseRes, enrollRes, allStudentsRes] = await Promise.all([
    db.from("courses")
      .select("id, name, block_number, room, is_active, is_advisory, teacher_id, class_id, course_code")
      .eq("id", id)
      .maybeSingle(),
    db.from("student_enrollments")
      .select("student_id")
      .eq("course_id", id)
      .eq("academic_year", "2025-26")
      .range(0, 9999),
    db.from("users")
      .select("id, first_name, last_name, call_by, grade, veracross_id, is_active, advisor_name")
      .eq("role", "student")
      .eq("is_active", true)
      .order("last_name")
      .order("first_name")
      .range(0, 9999),
  ])

  if (!courseRes.data) notFound()
  const c = courseRes.data as CourseRecord

  const studentIds = [...new Set((enrollRes.data ?? []).map(r => r.student_id as string))]

  const { data: studentRows } = studentIds.length > 0
    ? await db
        .from("users")
        .select("id, first_name, last_name, call_by, grade, veracross_id, is_active, advisor_name")
        .in("id", studentIds)
        .order("last_name")
        .order("first_name")
    : { data: [] as RosterStudent[] }

  const students    = (studentRows ?? []) as RosterStudent[]
  const allStudents = (allStudentsRes.data ?? []) as RosterStudent[]
  const active      = students.filter(s => s.is_active !== false)
  const canEdit     = ["admin", "super_admin"].includes(session.user.role)

  // Teacher display
  const { data: teacherRow } = c.teacher_id
    ? await db.from("users").select("display_name").eq("id", c.teacher_id).maybeSingle()
    : { data: null }
  const teacherName = teacherRow?.display_name ?? null

  const blockLabel =
    c.block_number === null     ? "Needs Block"
    : c.block_number === 9      ? "Advisory"
    :                             `Block ${c.block_number}`

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between"
              style={{ background: "#A6192E" }}>
        <div className="min-w-0">
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase truncate">
            {c.name} — Roster
          </div>
          <div className="text-white text-[10px] opacity-70 truncate">
            {active.length} active student{active.length === 1 ? "" : "s"}
            {students.length !== active.length ? ` · ${students.length} total` : ""}
            {teacherName ? ` · ${teacherName}` : ""}
          </div>
        </div>
        <SignOutButton />
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />
      <nav className="px-5 py-2 border-b flex items-center" style={{ borderColor: "#EAEAEA" }}>
        <BackLink fallbackHref="/admin/courses" />
      </nav>

      <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full flex flex-col gap-4">

        {/* Course summary card */}
        <div className="rounded-xl border p-3"
             style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-bold" style={{ color: "#3D3D3D" }}>{c.name}</span>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: c.block_number === 9 ? "#EEF6FF" : "#EAEAEA",
                    color:      c.block_number === 9 ? "#1E5FA6" : "#3D3D3D",
                  }}>
              {blockLabel}
            </span>
            {c.is_active === false && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase"
                    style={{ background: "#FEE2E2", color: "#CE2033" }}>
                Inactive
              </span>
            )}
          </div>
          <div className="text-[10px]" style={{ color: "#999" }}>
            {teacherName ?? "No teacher"}
            {c.room ? ` · ${c.room}` : ""}
            {c.class_id ? ` · ` : ""}
            {c.class_id && (
              <span style={{ fontFamily: "monospace" }}>ID {c.class_id}</span>
            )}
          </div>
        </div>

        {/* Roster */}
        <CourseRoster
          courseId={c.id}
          initialRoster={students}
          allStudents={allStudents}
          canEdit={canEdit}
        />
      </main>
    </div>
  )
}
