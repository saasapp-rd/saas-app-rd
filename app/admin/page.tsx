import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import Link from "next/link"

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!["admin", "super_admin"].includes(session.user.role)) redirect("/dashboard")

  const [s, c, ca] = await Promise.all([
    db.from("students").select("*", { count: "exact", head: true }).eq("is_active", true),
    db.from("courses").select("*", { count: "exact", head: true }).eq("is_active", true),
    db.from("coordinator_assignments").select("*", { count: "exact", head: true }),
  ])

  const sections = [
    { label: "Students",     href: "/admin/students",     count: s.count,  desc: "Manage student roster"            },
    { label: "Courses",      href: "/admin/courses",      count: c.count,  desc: "Courses, teachers, blocks, rooms" },
    { label: "Coordinators", href: "/admin/coordinators", count: ca.count, desc: "Assign coordinators to blocks"    },
    { label: "Calendar",     href: "/admin/calendar",     count: null,     desc: "School calendar and day types"    },
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between" style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">Admin</div>
          <div className="text-white text-[10px] opacity-70">{session.user.displayName}</div>
        </div>
        <SignOutButton />
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />
      <nav className="px-5 py-2 border-b flex items-center" style={{ borderColor: "#EAEAEA" }}>
        <Link href="/missing" className="text-xs font-bold" style={{ color: "#A6192E", textDecoration: "none" }}>
          &larr; All Missing Students
        </Link>
      </nav>

      <main className="flex-1 px-5 py-6 max-w-lg mx-auto w-full">
        <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-4" style={{ color: "#3D3D3D", opacity: 0.35 }}>
          Admin Dashboard
        </p>
        <div className="flex flex-col gap-3">
          {sections.map((sec) => (
            <Link key={sec.href} href={sec.href} style={{ textDecoration: "none" }}>
              <div
                className="rounded-xl p-4 border flex items-center justify-between"
                style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}
              >
                <div>
                  <div className="text-sm font-bold mb-0.5" style={{ color: "#3D3D3D" }}>{sec.label}</div>
                  <div className="text-[10px]" style={{ color: "#3D3D3D", opacity: 0.5 }}>{sec.desc}</div>
                </div>
                {sec.count !== null && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: "#EAEAEA", color: "#3D3D3D" }}>
                    {sec.count}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
