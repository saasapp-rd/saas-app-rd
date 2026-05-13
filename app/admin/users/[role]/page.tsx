import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import Link from "next/link"
import AddUserForm from "@/components/admin/AddUserForm"
import UserRowActions from "@/components/admin/UserRowActions"

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
  admin:       "Admins",
  super_admin: "Super Admins",
}

interface User {
  id:           string
  email:        string
  display_name: string | null
  phone?:       string | null
  role:         string
  is_active:    boolean | null
}

interface Student {
  id:            string
  first_name:    string
  last_name:     string
  grade:         number
  veracross_id:  string | null
  phone:         string | null
  is_active:     boolean | null
}

export default async function UserRolePage({
  params,
}: {
  params: Promise<{ role: string }>
}) {
  const { role } = await params
  if (!VALID_ROLES.includes(role)) notFound()

  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!["admin", "super_admin"].includes(session.user.role)) redirect("/dashboard")

  const isStudent = role === "student"
  const label     = ROLE_LABEL[role] ?? role

  // Students come from the students roster table, not the users/login table
  if (isStudent) {
    const { data, error } = await db
      .from("students")
      .select("id, first_name, last_name, grade, veracross_id, phone, is_active")
      .order("last_name")
      .order("first_name")

    if (error) console.error("[users/student] query error:", error.message)

    const students = (data ?? []) as Student[]
    const active   = students.filter(s => s.is_active !== false)

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
          <Link href="/dashboard" className="text-xs font-bold"
                style={{ color: "#A6192E", textDecoration: "none" }}>
            &larr; Dashboard
          </Link>
          <Link href="/admin/users" className="text-xs"
                style={{ color: "#999", textDecoration: "none" }}>
            All Roles
          </Link>
        </nav>
        <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full flex flex-col gap-5">
          {students.length === 0 ? (
            <p className="text-xs text-center py-6" style={{ color: "#999" }}>
              No students imported yet. Use the CSV import to add the roster.
            </p>
          ) : (
            <div>
              <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
                 style={{ color: "#3D3D3D", opacity: 0.35 }}>
                Students &mdash; {active.length} active
                {students.length !== active.length
                  ? ` · ${students.length - active.length} inactive` : ""}
              </p>
              <div className="flex flex-col gap-1.5">
                {students.map(s => (
                  <div key={s.id}
                       className="rounded-xl px-3 py-2.5 border flex items-center justify-between"
                       style={{
                         borderColor: s.is_active !== false ? "#EAEAEA" : "#F4F4F4",
                         background:  s.is_active !== false ? "#FAFAFA" : "#F9F9F9",
                         opacity:     s.is_active !== false ? 1 : 0.5,
                       }}>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "#3D3D3D" }}>
                        {s.last_name}, {s.first_name}
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: "#999" }}>
                        Gr {s.grade}
                        {s.veracross_id
                          ? <span> · <span style={{ fontFamily: "monospace" }}>ID {s.veracross_id}</span></span>
                          : null}
                        {s.phone ? ` · ${s.phone}` : ""}
                      </p>
                    </div>
                    {s.is_active === false && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded"
                            style={{ background: "#F4F4F4", color: "#999" }}>
                        Inactive
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
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
    .select("*")
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
        <Link href="/dashboard" className="text-xs font-bold"
              style={{ color: "#A6192E", textDecoration: "none" }}>
          &larr; Dashboard
        </Link>
        <Link href="/admin/users" className="text-xs"
              style={{ color: "#999", textDecoration: "none" }}>
          All Roles
        </Link>
      </nav>

      <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full flex flex-col gap-5">

        <AddUserForm defaultRole={role} />

        {users.length === 0 ? (
          <p className="text-xs text-center py-6" style={{ color: "#999" }}>
            No {label.toLowerCase()} yet. Add one above.
          </p>
        ) : (
          <div>
            <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
               style={{ color: "#3D3D3D", opacity: 0.35 }}>
              {label} &mdash; {active.length} active
              {users.length !== active.length
                ? ` · ${users.length - active.length} inactive` : ""}
            </p>
            <div className="flex flex-col gap-1.5">
              {users.map(u => (
                <UserRowActions
                  key={u.id}
                  id={u.id}
                  displayName={u.display_name ?? u.email}
                  email={u.email}
                  phone={u.phone ?? null}
                  role={u.role}
                  isActive={u.is_active !== false}
                  isSelf={u.id === session.user.userId}
                  myCourses={role === "teacher" ? (coursesByTeacher[u.id] ?? []) : undefined}
                  allCourses={role === "teacher" ? allCourses : undefined}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
