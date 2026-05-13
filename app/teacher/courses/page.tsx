import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/supabase"
import { getCurrentPeriod } from "@/lib/schedule"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import WelfareConcernLink from "@/components/WelfareConcernLink"
import CourseRosterCard from "@/components/teacher/CourseRosterCard"
import Link from "next/link"

export const dynamic = "force-dynamic"

interface Student { id: string; first_name: string; last_name: string; grade: number }
interface Course  { id: string; name: string; block_number: number; room: string | null }

export default async function TeacherCoursesPage() {
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
  const courseList     = (courses ?? []) as Course[]
  const courseIds      = courseList.map(c => c.id)

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

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between"
              style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">
            My Courses
          </div>
          <div className="text-white text-[10px] opacity-70">
            {courseList.length} course{courseList.length !== 1 ? "s" : ""} · manage rosters
          </div>
        </div>
        <SignOutButton />
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />
      <nav className="px-5 py-2 border-b flex items-center gap-4" style={{ borderColor: "#EAEAEA" }}>
        <Link href="/dashboard" className="text-xs font-bold"
              style={{ color: "#A6192E", textDecoration: "none" }}>
          &larr; Dashboard
        </Link>
        <Link href="/missing" className="text-xs"
              style={{ color: "#999", textDecoration: "none" }}>
          Live View
        </Link>
      </nav>

      <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full flex flex-col gap-3">

        {courseList.length === 0 ? (
          <div className="rounded-xl px-4 py-8 text-center border" style={{ borderColor: "#EAEAEA" }}>
            <p className="text-sm font-bold mb-1" style={{ color: "#3D3D3D" }}>No courses assigned</p>
            <p className="text-xs" style={{ color: "#999" }}>
              Ask your admin to assign you as the teacher on your courses.
            </p>
          </div>
        ) : (
          courseList.map(course => (
            <CourseRosterCard
              key={course.id}
              courseId={course.id}
              courseName={course.name}
              blockNumber={course.block_number}
              room={course.room}
              students={studentsByCourse[course.id] ?? []}
              isActive={course.block_number === activeBlockNum}
            />
          ))
        )}

        <WelfareConcernLink />
      </main>
    </div>
  )
}
