import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import BackLink from "@/components/BackLink"
import Link from "next/link"

export const dynamic = "force-dynamic"

const ALLOWED = ["coordinator","counselor","dean","admin","super_admin","teacher","staff"]

function blockBadge(n: number) { return n === 9 ? "ADV" : "B" + n }
function blockFull(n:  number) { return n === 9 ? "Advisory" : "Block " + n }

export default async function TeacherProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!ALLOWED.includes(session.user.role)) redirect("/dashboard")

  const { data: teacher, error } = await db
    .from("users")
    .select("id, display_name, email, phone, role")
    .eq("id", id)
    .single()

  if (error || !teacher) notFound()

  const { data: courses } = await db
    .from("courses")
    .select("id, name, course_code, block_number, room, academic_year")
    .eq("teacher_id", id)
    .order("block_number")

  const courseList = (courses ?? []) as {
    id: string; name: string; course_code: string | null
    block_number: number; room: string | null; academic_year: string | null
  }[]

  const courseIds = courseList.map(c => c.id)
  const { data: enrollCounts } = courseIds.length
    ? await db.from("student_enrollments").select("course_id").in("course_id", courseIds)
    : { data: [] }

  const countMap = new Map<string, number>()
  for (const e of (enrollCounts ?? [])) {
    const cid = e.course_id as string
    countMap.set(cid, (countMap.get(cid) ?? 0) + 1)
  }

  const displayName = teacher.display_name ?? teacher.email ?? "Unknown"

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between"
              style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">Teacher Profile</div>
          <div className="text-white text-[10px] opacity-70">{displayName}</div>
        </div>
        <SignOutButton />
      </header>
      <TestModeBanner role={session.user.role} />

      <nav className="px-5 py-2 border-b flex items-center gap-4" style={{ borderColor: "#EAEAEA" }}>
        <BackLink fallbackHref="/admin/users/teacher" />
      </nav>

      <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full flex flex-col gap-5">

        {/* Teacher info */}
        <div className="rounded-xl p-4 border" style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-black flex-shrink-0"
                 style={{ background: "#EAEAEA", color: "#888" }}>
              {displayName[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-black" style={{ color: "#3D3D3D" }}>{displayName}</h1>
              <p className="text-[10px]" style={{ color: "#999" }}>{teacher.email}</p>
              {teacher.phone && (
                <p className="text-[10px]" style={{ color: "#999" }}>{teacher.phone}</p>
              )}
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase mt-1 inline-block"
                    style={{ background: "#EAEAEA", color: "#3D3D3D" }}>
                {teacher.role.replace("_", " ")}
              </span>
            </div>
          </div>
        </div>

        {/* Courses */}
        <div>
          <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
             style={{ color: "#3D3D3D", opacity: 0.35 }}>
            Courses &mdash; {courseList.length}
          </p>
          {courseList.length === 0 ? (
            <p className="text-xs text-center py-6" style={{ color: "#999" }}>No courses assigned.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {courseList.map(c => {
                const count = countMap.get(c.id) ?? 0
                return (
                  <Link key={c.id} href={"/courses/" + c.id} style={{ textDecoration: "none" }}>
                    <div className="rounded-xl px-4 py-3 border flex items-center gap-3"
                         style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
                      <span className="w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0"
                            style={{ background: "#EAEAEA", color: "#3D3D3D" }}>
                        {blockBadge(c.block_number)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "#3D3D3D" }}>
                          {c.name}
                        </p>
                        <p className="text-[10px]" style={{ color: "#999" }}>
                          {blockFull(c.block_number)}
                          {" · "}{count} student{count !== 1 ? "s" : ""}
                          {c.room ? " · Room " + c.room : ""}
                          {c.course_code ? " · " + c.course_code : ""}
                        </p>
                      </div>
                      <span style={{ color: "#BABABA" }}>&rarr;</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
