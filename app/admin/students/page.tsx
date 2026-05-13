import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import Link from "next/link"
import AddStudentForm from "@/components/admin/AddStudentForm"

export default async function StudentsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!["admin", "super_admin"].includes(session.user.role)) redirect("/dashboard")

  const { data: students } = await db
    .from("users")
    .select("id, first_name, last_name, grade, veracross_id")
    .eq("role", "student")
    .eq("is_active", true)
    .order("last_name")
    .order("first_name")

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between" style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">Admin &mdash; Students</div>
          <div className="text-white text-[10px] opacity-70">{students?.length ?? 0} active students</div>
        </div>
        <SignOutButton />
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />
      <nav className="px-5 py-2 border-b flex items-center gap-4" style={{ borderColor: "#EAEAEA" }}>
        <Link href="/admin" className="text-xs font-bold" style={{ color: "#A6192E", textDecoration: "none" }}>
          &larr; Admin
        </Link>
      </nav>

      <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full flex flex-col gap-5">
        <AddStudentForm />

        <div>
          <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2" style={{ color: "#3D3D3D", opacity: 0.35 }}>
            Roster &mdash; {students?.length ?? 0} students
          </p>
          <div className="flex flex-col gap-1.5">
            {students?.map(s => (
              <div key={s.id} className="rounded-xl px-4 py-2.5 border flex items-center justify-between"
                   style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold" style={{ color: "#3D3D3D" }}>
                    {s.last_name}, {s.first_name}
                  </span>
                  {s.veracross_id && (
                    <span className="text-[10px]" style={{ color: "#999" }}>{s.veracross_id}</span>
                  )}
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "#EAEAEA", color: "#3D3D3D" }}>
                  Gr {s.grade}
                </span>
              </div>
            ))}
            {(!students || students.length === 0) && (
              <p className="text-xs text-center py-8" style={{ color: "#999" }}>
                No students yet. Add some above.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
