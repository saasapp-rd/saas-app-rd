import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import Link from "next/link"
import AddUserForm from "@/components/admin/AddUserForm"
import AddStudentForm from "@/components/admin/AddStudentForm"
import StudentList from "@/components/admin/StudentList"
import UserList from "@/components/admin/UserList"
import { fetchAllPaginated } from "@/lib/dbHelpers"

export const dynamic = "force-dynamic"

const VALID_ROLES = [
  "student","teacher","staff","coordinator","counselor","dean","admin","super_admin",
]

const ROLE_LABEL: Record<string, string> = {
  student:     "Students",
  teacher:     "Teachers",
  staff:       "Staff",
  coordinator: "Coordinators",
  counselor:   "Counselors",
  dean:        "Deans",
  admin:       "Administrators",
  super_admin: "Super Admins",
}

interface User {
  id:             string
  email:          string
  display_name:   string | null
  first_name:     string | null
  last_name:      string | null
  phone:          string | null
  business_phone: string | null
  role:           string
  roles:          string[] | null
  is_active:      boolean | null
  veracross_id:   string | null
  dean_grades:    number[] | null
  job_title:      string | null
  needs_info:     boolean | null
}

interface Student {
  id:            string
  first_name:    string | null
  last_name:     string | null
  call_by:       string | null
  grade:         number | null
  veracross_id:  string | null
  phone:         string | null
  is_active:     boolean | null
  advisor_name:  string | null
}

export default async function UserRolePage({
  params,
  searchParams,
}: {
  params:       Promise<{ role: string }>
  searchParams: Promise<{ edit?: string }>
}) {
  const { role } = await params
  const { edit } = await searchParams
  if (!VALID_ROLES.includes(role)) notFound()

  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!["admin", "super_admin"].includes(session.user.role)) redirect("/dashboard")

  const isStudent = role === "student"
  const label     = ROLE_LABEL[role] ?? role

  // Students are now stored in the users table with role = 'student'
  if (isStudent) {
    // Three parallel queries: students, all enrollments (this year), all
    // courses + teacher_id so we can hydrate enrollment details client-side.
    // Bumped past PostgREST's 1000-row default — 800 students × 7 classes
    // is well over a thousand rows.
    const [studentsRes, enrollData, courseRes] = await Promise.all([
      db.from("users")
        .select("id, first_name, last_name, call_by, grade, veracross_id, phone, is_active, advisor_name")
        .eq("role", "student")
        .order("last_name")
        .order("first_name")
        .range(0, 9999),
      // Paginate past Supabase's 1000-row cap — schools have 1500+ enrollments.
      fetchAllPaginated<{ student_id: string; course_id: string; block_number: number | null }>(() =>
        db.from("student_enrollments")
          .select("student_id, course_id, block_number")
          .eq("academic_year", "2025-26")
      ),
      db.from("courses")
        .select("id, name, block_number, room, is_advisory, teacher_id")
        .range(0, 9999),
    ])
    const enrollRes = { data: enrollData }

    if (studentsRes.error) console.error("[users/student] query error:", studentsRes.error.message)

    const students = (studentsRes.data ?? []) as Student[]
    const active   = students.filter(s => s.is_active !== false)

    // Hydrate teacher names for the courses students are in.
    const teacherIds = [...new Set((courseRes.data ?? []).map(c => c.teacher_id).filter(Boolean) as string[])]
    const { data: teacherRows } = teacherIds.length > 0
      ? await db.from("users").select("id, display_name").in("id", teacherIds)
      : { data: [] as { id: string; display_name: string | null }[] }
    const teacherNameById = new Map<string, string>()
    for (const t of teacherRows ?? []) {
      if (t.display_name) teacherNameById.set(t.id as string, t.display_name)
    }

    interface CourseInfo {
      name: string
      block: number | null
      room: string | null
      isAdvisory: boolean
      teacherName: string | null
    }
    const courseById = new Map<string, CourseInfo>()
    for (const c of courseRes.data ?? []) {
      courseById.set(c.id as string, {
        name: c.name as string,
        block: (c.block_number ?? null) as number | null,
        room: (c.room ?? null) as string | null,
        isAdvisory: (c.is_advisory ?? false) as boolean,
        teacherName: c.teacher_id ? teacherNameById.get(c.teacher_id as string) ?? null : null,
      })
    }

    type EnrollmentRow = { block: number | null; courseName: string; room: string | null; teacherName: string | null; isAdvisory: boolean }
    const enrollmentsByStudent: Record<string, EnrollmentRow[]> = {}
    for (const e of enrollRes.data ?? []) {
      const c = courseById.get(e.course_id as string)
      if (!c) continue
      const studentId = e.student_id as string
      if (!enrollmentsByStudent[studentId]) enrollmentsByStudent[studentId] = []
      // Course is the source of truth for block — enrollments.block_number
      // is a cached copy that may not be synced for placeholder courses.
      enrollmentsByStudent[studentId].push({
        block:       c.block,
        courseName:  c.name,
        room:        c.room,
        teacherName: c.teacherName,
        isAdvisory:  c.isAdvisory,
      })
    }
    for (const list of Object.values(enrollmentsByStudent)) {
      // Null blocks (placeholder courses) sort to the bottom.
      list.sort((a, b) => (a.block ?? 99) - (b.block ?? 99))
    }

    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
        <header className="px-5 py-3.5 flex items-center justify-between"
                style={{ background: "#A6192E" }}>
          <div>
            <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">
              {label}
            </div>
            <div className="text-white text-[10px] opacity-70">
              {active.length} active · {students.length} total
            </div>
          </div>
          <SignOutButton />
        </header>
        <TestModeBanner name={session.user.displayName} role={session.user.role} />
        <nav className="px-5 py-2 border-b flex items-center gap-4" style={{ borderColor: "#EAEAEA" }}>
          <Link href="/admin/users" className="text-xs font-bold"
                style={{ color: "#A6192E", textDecoration: "none" }}>
            &larr; Manage Users
          </Link>
        </nav>
        <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full flex flex-col gap-5">
          <AddStudentForm />
          <StudentList students={students} enrollmentsByStudent={enrollmentsByStudent} />
        </main>
      </div>
    )
  }

  // Teachers: fetch courses too so we can show/edit assignments inline
  interface CourseRow { id: string; name: string; block_number: number; room: string | null; teacher_id: string | null }
  let allCourses:    CourseRow[] = []
  let coursesByTeacher: Record<string, CourseRow[]> = {}

  if (role === "teacher") {
    const { data: cdata } = await db
      .from("courses")
      .select("id, name, block_number, room, teacher_id")
      .eq("is_active", true)
      .order("block_number")
    allCourses = (cdata ?? []) as CourseRow[]
    for (const c of allCourses) {
      if (c.teacher_id) {
        if (!coursesByTeacher[c.teacher_id]) coursesByTeacher[c.teacher_id] = []
        coursesByTeacher[c.teacher_id].push(c)
      }
    }
  }

  // All other roles: query the users/login table
  // select("*") returns whatever columns exist — never fails on missing columns
  // from unapplied migrations (e.g. phone, employee_id added later)
  const { data, error } = await db
    .from("users")
    .select("id, email, display_name, first_name, last_name, phone, business_phone, role, roles, is_active, veracross_id, dean_grades, job_title, needs_info")
    .eq("role", role)
    .order("display_name")

  if (error) console.error("[users/role] query error:", error.message)

  const users  = (data ?? []) as User[]
  const active = users.filter(u => u.is_active !== false)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between"
              style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">
            {label}
          </div>
          <div className="text-white text-[10px] opacity-70">
            {active.length} active · {users.length} total
          </div>
        </div>
        <SignOutButton />
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />
      <nav className="px-5 py-2 border-b flex items-center gap-4" style={{ borderColor: "#EAEAEA" }}>
        <Link href="/admin/users" className="text-xs font-bold"
              style={{ color: "#A6192E", textDecoration: "none" }}>
          &larr; Manage Users
        </Link>
      </nav>

      <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full flex flex-col gap-5">

        <AddUserForm defaultRole={role} callerRole={session.user.role} />

        {users.length === 0 ? (
          <p className="text-xs text-center py-6" style={{ color: "#999" }}>
            No {label.toLowerCase()} yet. Add one above.
          </p>
        ) : (
          <UserList
            users={users}
            currentUserId={session.user.userId}
            label={label}
            role={role}
            coursesByUser={role === "teacher" ? coursesByTeacher : undefined}
            allCourses={role === "teacher" ? allCourses : undefined}
            initialEditUserId={edit}
          />
        )}
      </main>
    </div>
  )
}
