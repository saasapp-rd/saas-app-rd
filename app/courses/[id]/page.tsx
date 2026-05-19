import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import Link from "next/link"

export const dynamic = "force-dynamic"

const ALLOWED = ["coordinator","counselor","dean","admin","super_admin","teacher","staff"]

function blockFull(n: number) { return n === 9 ? "Advisory" : "Block " + n }

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!ALLOWED.includes(session.user.role)) redirect("/dashboard")

  const { data: course, error } = await db
    .from("courses")
    .select("id, name, course_code, block_number, room, academic_year, teacher_id")
    .eq("id", id)
    .maybeSingle()

  if (error) console.error("[courses/[id]] query error:", error.message)
  if (!course) notFound()

  const { data: teacher } = course.teacher_id
    ? await db.from("users").select("id, display_name, email").eq("id", course.teacher_id).maybeSingle()
    : { data: null }

  // Students live in users post-migration 011 — the legacy students table
  // was dropped. Don't filter by role since a teacher of an unusual
  // schedule might still appear in a roster.
  const { data: enrollData } = await db
    .from("student_enrollments")
    .select("student_id")
    .eq("course_id", id)
    .range(0, 9999)

  const studentIds = [...new Set((enrollData ?? []).map(e => e.student_id as string))]

  const { data: students } = studentIds.length
    ? await db
        .from("users")
        .select("id, first_name, last_name, grade, call_by")
        .in("id", studentIds)
        .order("last_name")
        .order("first_name")
    : { data: [] }

  const roster = (students ?? []) as {
    id: string; first_name: string | null; last_name: string | null
    grade: number | null; call_by: string | null
  }[]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between"
              style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">Course Detail</div>
          <div className="text-white text-[10px] opacity-70">
            {blockFull(course.block_number as number)} &middot; {course.academic_year ?? ""}
          </div>
        </div>
        <SignOutButton />
      </header>

      <nav className="px-5 py-2 border-b flex items-center gap-4" style={{ borderColor: "#EAEAEA" }}>
        <Link href="/admin/courses"
              className="text-xs font-bold"
              style={{ color: "#A6192E", textDecoration: "none" }}>
          &larr; Back
        </Link>
      </nav>

      <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full flex flex-col gap-5">

        {/* Course info */}
        <div className="rounded-xl p-4 border" style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
          <h1 className="text-lg font-black mb-1" style={{ color: "#3D3D3D" }}>{course.name}</h1>
          <div className="flex flex-wrap gap-2 text-[10px] mb-3">
            <span className="font-bold px-2 py-0.5 rounded"
                  style={{ background: "#EAEAEA", color: "#3D3D3D" }}>
              {blockFull(course.block_number as number)}
            </span>
            {course.course_code  && (
              <span style={{ color: "#999" }}>{course.course_code}</span>
            )}
            {course.room         && (
              <span style={{ color: "#999" }}>Room {course.room}</span>
            )}
            {course.academic_year && (
              <span style={{ color: "#999" }}>{course.academic_year}</span>
            )}
          </div>

          {/* Teacher */}
          <div className="border-t pt-3" style={{ borderColor: "#EAEAEA" }}>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-1.5"
               style={{ color: "#3D3D3D", opacity: 0.4 }}>Teacher</p>
            {teacher ? (
              <Link href={"/teachers/" + teacher.id} style={{ textDecoration: "none" }}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
                       style={{ background: "#EAEAEA", color: "#888" }}>
                    {(teacher.display_name ?? teacher.email ?? "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#A6192E" }}>
                      {teacher.display_name ?? teacher.email}
                      <span className="ml-1 text-[9px]">&#x2197;</span>
                    </p>
                    <p className="text-[10px]" style={{ color: "#999" }}>{teacher.email}</p>
                  </div>
                </div>
              </Link>
            ) : (
              <p className="text-xs" style={{ color: "#BABABA" }}>No teacher assigned</p>
            )}
          </div>
        </div>

        {/* Roster */}
        <div>
          <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
             style={{ color: "#3D3D3D", opacity: 0.35 }}>
            Roster &mdash; {roster.length} {roster.length === 1 ? "student" : "students"}
          </p>
          {roster.length === 0 ? (
            <p className="text-xs text-center py-6" style={{ color: "#999" }}>No students enrolled.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {roster.map(s => (
                <Link key={s.id} href={"/students/" + s.id} style={{ textDecoration: "none" }}>
                  <div className="rounded-xl px-4 py-3 border flex items-center justify-between"
                       style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "#3D3D3D" }}>
                        {s.last_name ?? "?"}, {s.call_by ?? s.first_name ?? "?"}
                      </p>
                      <p className="text-[10px]" style={{ color: "#999" }}>
                        {s.grade ? `Grade ${s.grade}` : "No grade"}
                      </p>
                    </div>
                    <span style={{ color: "#BABABA" }}>&rarr;</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
