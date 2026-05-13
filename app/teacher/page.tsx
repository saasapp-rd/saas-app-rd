import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/supabase"
import { getCurrentPeriod } from "@/lib/schedule"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import Link from "next/link"
import StudentRoster from "@/components/teacher/StudentRoster"
import WelfareConcernLink from "@/components/WelfareConcernLink"

interface Student { id: string; first_name: string; last_name: string; grade: number }
interface Course  { id: string; name: string; block_number: number; room: string | null }

export default async function TeacherPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!["teacher", "admin", "super_admin"].includes(session.user.role)) redirect("/dashboard")

  const [period, { data: courses }] = await Promise.all([
    getCurrentPeriod(),
    db.from("courses")
      .select("id, name, block_number, room")
      .eq("teacher_id", session.user.userId)
      .eq("is_active", true)
      .order("block_number"),
  ])

  const activeBlockNum = period.type === "block" ? period.blockNumber : null
  const courseIds      = (courses ?? []).map((c: Course) => c.id)

  let studentsByCourse: Record<string, Student[]> = {}

  if (courseIds.length > 0) {
    const { data: enr } = await db
      .from("student_enrollments")
      .select("course_id, students(id, first_name, last_name, grade)")
      .in("course_id", courseIds)

    for (const row of enr ?? []) {
      const s = row.students as unknown as Student | null
      if (!s) continue
      if (!studentsByCourse[row.course_id]) studentsByCourse[row.course_id] = []
      studentsByCourse[row.course_id].push(s)
    }
    for (const cid of Object.keys(studentsByCourse)) {
      studentsByCourse[cid].sort((a, b) => a.last_name.localeCompare(b.last_name))
    }
  }

  // Fetch today's incident statuses so teacher sees correct state on page load
  const allStudentIds = Object.values(studentsByCourse).flat().map(s => s.id)
  const initialStatuses: Record<string, "reported" | "with_me" | "found"> = {}

  if (allStudentIds.length > 0) {
    const today = new Date().toISOString().split("T")[0]
    const { data: todayInc } = await db
      .from("incidents")
      .select("student_id, status, located_excused")
      .in("student_id", allStudentIds)
      .gte("reported_at", today + "T00:00:00+00:00")
      .lte("reported_at", today + "T23:59:59+00:00")

    for (const inc of todayInc ?? []) {
      if (inc.status === "open") {
        initialStatuses[inc.student_id] = "reported"
      } else if (inc.status === "resolved" && inc.located_excused) {
        initialStatuses[inc.student_id] = "with_me"
      } else if (inc.status === "resolved") {
        // Only set "found" if not already marked by the teacher as with_me
        if (!initialStatuses[inc.student_id]) {
          initialStatuses[inc.student_id] = "found"
        }
      }
    }
  }

  const periodLabel =
    period.type === "block"     ? "Block " + period.blockNumber + " · " + period.periodStart + "–" + period.periodEnd :
    period.type === "lunch"     ? "Lunch" :
    period.type === "community" ? "Community" :
                                  "Outside school hours"

  const isSchoolHours = period.type !== "outside_school"

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between" style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">{periodLabel}</div>
          <div className="text-white text-[10px] opacity-70">{session.user.displayName}</div>
        </div>
        <SignOutButton />
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />
      <nav className="px-5 py-2 border-b flex items-center gap-4" style={{ borderColor: "#EAEAEA" }}>
        <Link href="/dashboard" className="text-xs font-bold"
              style={{ color: "#A6192E", textDecoration: "none" }}>
          Dashboard
        </Link>
        <Link href="/missing" className="text-xs"
              style={{ color: "#999", textDecoration: "none" }}>
          Live View
        </Link>
        <Link href="/teacher/courses" className="text-xs"
              style={{ color: "#999", textDecoration: "none" }}>
          Courses
        </Link>
      </nav>

      <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full flex flex-col gap-5">

        {isSchoolHours && period.type !== "block" && (
          <div className="rounded-xl px-4 py-3 text-center"
               style={{ background: "#FFF8E0", border: "1px solid #F0C040" }}>
            <p className="text-xs font-bold" style={{ color: "#8B6200" }}>{periodLabel}</p>
            <p className="text-[10px] mt-0.5" style={{ color: "#8B6200", opacity: 0.7 }}>
              No class active — roster shown below for reference
            </p>
          </div>
        )}

        {(courses ?? []).length === 0 && (
          <div className="rounded-xl px-4 py-6 text-center border" style={{ borderColor: "#EAEAEA" }}>
            <p className="text-sm font-bold mb-1" style={{ color: "#3D3D3D" }}>No courses assigned</p>
            <p className="text-xs" style={{ color: "#999" }}>
              Ask your admin to assign you as the teacher on your courses.
            </p>
          </div>
        )}

        {(courses ?? []).map((course: Course) => {
          const students = studentsByCourse[course.id] ?? []
          const isActive = course.block_number === activeBlockNum
          return (
            <div key={course.id}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-[9px] font-bold tracking-[0.25em] uppercase"
                     style={{ color: "#3D3D3D", opacity: 0.35 }}>
                    Block {course.block_number}{course.room ? " · " + course.room : ""}
                  </p>
                  <p className="text-sm font-bold" style={{ color: "#3D3D3D" }}>{course.name}</p>
                </div>
                {isActive && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "#A6192E", color: "#fff" }}>
                    NOW
                  </span>
                )}
              </div>
              {students.length === 0 ? (
                <p className="text-xs py-3 text-center" style={{ color: "#999" }}>
                  No students enrolled — add enrollments in Admin.
                </p>
              ) : (
                <StudentRoster
                  students={students}
                  blockNumber={course.block_number}
                  courseId={course.id}
                  initialStatuses={initialStatuses}
                />
              )}
            </div>
          )
        })}

        <WelfareConcernLink />
      </main>
    </div>
  )
}
