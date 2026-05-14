import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import Link from "next/link"
import AddCourseForm from "@/components/admin/AddCourseForm"
import CourseRowActions from "@/components/admin/CourseRowActions"
import type { CourseRow, TeacherOption } from "@/components/admin/CourseRowActions"

export const dynamic = "force-dynamic"

export default async function CoursesPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!["admin", "super_admin"].includes(session.user.role)) redirect("/dashboard")

  const [{ data: coursesRaw }, { data: teachersRaw }] = await Promise.all([
    db.from("courses")
      .select("id, name, block_number, room, is_advisory, teacher:teacher_id(display_name)")
      .eq("is_active", true)
      .order("block_number")
      .order("name"),
    db.from("users")
      .select("id, display_name")
      .in("role", ["teacher", "advisor"])
      .eq("is_active", true)
      .order("display_name"),
  ])

  const courses  = (coursesRaw  ?? []) as unknown as CourseRow[]
  const teachers = (teachersRaw ?? []) as TeacherOption[]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between" style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">Admin &mdash; Courses</div>
          <div className="text-white text-[10px] opacity-70">{courses.length} active courses</div>
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
        <AddCourseForm teachers={teachers} />

        <div>
          <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
             style={{ color: "#3D3D3D", opacity: 0.35 }}>
            Courses &mdash; {courses.length}
          </p>
          {courses.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: "#999" }}>No courses yet.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {courses.map(c => (
                <CourseRowActions key={c.id} course={c} teachers={teachers} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
