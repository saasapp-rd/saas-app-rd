import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import Link from "next/link"
import AddCourseForm from "@/components/admin/AddCourseForm"
import CoursesList from "@/components/admin/CoursesList"
import type { CourseRow, TeacherOption } from "@/components/admin/CourseRowActions"
import { fetchAllPaginated } from "@/lib/dbHelpers"

export const dynamic = "force-dynamic"

interface CourseRecord {
  id:             string
  name:           string
  block_number:   number | null
  room:           string | null
  is_advisory:    boolean | null
  is_active:      boolean | null
  teacher_id:     string | null
  class_id:       string | null
  course_code:    string | null
  school_level:   string | null
  grade_level:    string | null
  meeting_times:  string | null
}

export default async function CoursesPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!["admin", "super_admin"].includes(session.user.role)) redirect("/dashboard")

  // Pull courses without the embedded teacher join. The embed was silently
  // dropping rows in some cases; this is more robust + lets us bump the
  // range past PostgREST's 1000-row default.
  const { data: courseData, error: courseErr } = await db
    .from("courses")
    .select("id, name, block_number, room, is_advisory, is_active, teacher_id, class_id, course_code, school_level, grade_level, meeting_times")
    .order("is_active",    { ascending: false })
    .order("block_number", { ascending: true, nullsFirst: true })
    .order("name",         { ascending: true  })
    .range(0, 9999)

  if (courseErr) console.error("[admin/courses] courses query error:", courseErr.message)

  const courseRecords = (courseData ?? []) as CourseRecord[]

  // Parallel queries:
  //   - Teachers/advisors to populate the Add Course / re-assign dropdowns.
  //   - display_names for users referenced by current courses (we might
  //     assign a course to someone whose primary role isn't teacher).
  //   - All enrollments so we can show per-course counts in the view panel.
  const referencedTeacherIds = [...new Set(
    courseRecords.map(c => c.teacher_id).filter((id): id is string => !!id)
  )]

  const [{ data: teachersRaw }, { data: referencedRaw }, enrollmentsRaw] = await Promise.all([
    db.from("users")
      .select("id, display_name")
      .in("role", ["teacher", "advisor"])
      .eq("is_active", true)
      .order("display_name"),
    referencedTeacherIds.length > 0
      ? db.from("users")
          .select("id, display_name")
          .in("id", referencedTeacherIds)
      : Promise.resolve({ data: [] as { id: string; display_name: string | null }[] }),
    // Paginate past Supabase's default 1000-row cap — a school with
    // 1500+ enrollments was getting under-counted before. Pull
    // student_id too so we can render a roster preview in each
    // course's view panel.
    fetchAllPaginated<{ course_id: string; student_id: string }>(() =>
      db.from("student_enrollments")
        .select("course_id, student_id")
        .eq("academic_year", "2025-26")
    ),
  ])

  const teachers = (teachersRaw ?? []) as TeacherOption[]
  const nameById = new Map<string, string | null>()
  for (const u of (referencedRaw ?? []) as { id: string; display_name: string | null }[]) {
    nameById.set(u.id, u.display_name)
  }

  const studentIdsByCourse = new Map<string, string[]>()
  const allStudentIds      = new Set<string>()
  for (const e of enrollmentsRaw) {
    const list = studentIdsByCourse.get(e.course_id) ?? []
    list.push(e.student_id)
    studentIdsByCourse.set(e.course_id, list)
    allStudentIds.add(e.student_id)
  }

  // Look up display info for every enrolled student in one shot —
  // hydrating per-course in the loop would be N round-trips.
  type StudentInfo = { id: string; first_name: string | null; last_name: string | null; grade: number | null }
  const studentById = new Map<string, StudentInfo>()
  if (allStudentIds.size > 0) {
    const ids = [...allStudentIds]
    for (let i = 0; i < ids.length; i += 500) {
      const { data: rows } = await db
        .from("users")
        .select("id, first_name, last_name, grade")
        .in("id", ids.slice(i, i + 500))
      for (const r of (rows ?? []) as StudentInfo[]) studentById.set(r.id, r)
    }
  }

  const courses: CourseRow[] = courseRecords.map(c => {
    const ids   = studentIdsByCourse.get(c.id) ?? []
    const roster = ids
      .map(id => studentById.get(id))
      .filter((s): s is StudentInfo => !!s)
      .sort((a, b) =>
        (a.last_name ?? "").localeCompare(b.last_name ?? "") ||
        (a.first_name ?? "").localeCompare(b.first_name ?? "")
      )
    return {
      id:               c.id,
      name:             c.name,
      block_number:     c.block_number,
      room:             c.room,
      is_advisory:      c.is_advisory ?? false,
      is_active:        c.is_active !== false,
      teacher:          c.teacher_id ? { display_name: nameById.get(c.teacher_id) ?? null } : null,
      class_id:         c.class_id,
      course_code:      c.course_code,
      school_level:     c.school_level,
      grade_level:      c.grade_level,
      meeting_times:    c.meeting_times,
      enrollment_count: ids.length,
      roster,
    }
  })

  const activeCount = courses.filter(c => c.is_active !== false).length

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between" style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">Admin &mdash; Courses</div>
          <div className="text-white text-[10px] opacity-70">
            {activeCount} active · {courses.length} total
          </div>
        </div>
        <SignOutButton />
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />
      <nav className="px-5 py-2 border-b flex items-center gap-4" style={{ borderColor: "#EAEAEA" }}>
        <Link href="/admin/config" className="text-xs font-bold" style={{ color: "#A6192E", textDecoration: "none" }}>
          &larr; Admin
        </Link>
      </nav>

      <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full flex flex-col gap-5">
        {courseErr && (
          <div className="rounded-xl px-4 py-3 text-xs"
               style={{ background: "#FFF0F0", border: "1px solid #FECACA", color: "#CE2033" }}>
            Database error loading courses: {courseErr.message}
          </div>
        )}
        <AddCourseForm teachers={teachers} />
        <CoursesList courses={courses} teachers={teachers} />
      </main>
    </div>
  )
}
