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
  if (!["admin","super_admin"].includes(session.user.role)) redirect("/dashboard")

  const today = new Date().toISOString().split("T")[0]

  const [
    { count: userCount },
    { count: openCount },
    { count: todayCount },
    { count: flagCount },
  ] = await Promise.all([
    db.from("users").select("*", { count: "exact", head: true }).eq("is_active", true),
    db.from("incidents").select("*", { count: "exact", head: true }).eq("status", "open"),
    db.from("incidents").select("*", { count: "exact", head: true })
      .gte("reported_at", today + "T00:00:00+00:00"),
    db.from("student_concern_flags").select("*", { count: "exact", head: true }),
  ])

  const tiles = [
    { label: "Users",         href: "/admin/users",  count: userCount   ?? 0, color: "#A6192E"  },
    { label: "Today",         href: "/admin/daily",  count: todayCount  ?? 0, color: "#1E5FA6"  },
    { label: "Open Now",      href: "/missing",      count: openCount   ?? 0, color: openCount  ? "#CE2033" : "#3D3D3D" },
    { label: "Concern Flags", href: "/counselor",    count: flagCount   ?? 0, color: flagCount  ? "#8B6200" : "#3D3D3D" },
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between"
              style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">Admin</div>
          <div className="text-white text-[10px] opacity-70">{session.user.displayName}</div>
        </div>
        <SignOutButton />
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />
      <nav className="px-5 py-2 border-b flex items-center gap-4" style={{ borderColor: "#EAEAEA" }}>
        <Link href="/missing" className="text-xs font-bold"
              style={{ color: "#A6192E", textDecoration: "none" }}>
          &larr; Live Feed
        </Link>
      </nav>

      <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full flex flex-col gap-5">
        <h1 className="text-xl font-black" style={{ color: "#3D3D3D" }}>
          Admin Panel
        </h1>

        <div className="grid grid-cols-2 gap-3">
          {tiles.map(t => (
            <Link key={t.href} href={t.href} style={{ textDecoration: "none" }}>
              <div className="rounded-2xl p-5 border flex flex-col justify-between min-h-[96px]"
                   style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
                <div className="text-3xl font-black" style={{ color: t.color }}>{t.count}</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.15em]"
                     style={{ color: "#3D3D3D", opacity: 0.5 }}>
                  {t.label}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick links */}
        <div className="flex flex-col gap-2">
          {[
            { label: "Manage Users",        href: "/admin/users",  desc: "Add, edit, deactivate staff accounts" },
            { label: "Daily Summary",        href: "/admin/daily",  desc: "Today's incident log" },
            { label: "Live Missing Feed",    href: "/missing",      desc: "Real-time student status" },
            { label: "Coordinator Queue",    href: "/coordinator",  desc: "Active incidents workflow" },
            { label: "Dean / Patterns",      href: "/dean",         desc: "Elevated incidents and trends" },
          ].map(l => (
            <Link key={l.href} href={l.href} style={{ textDecoration: "none" }}>
              <div className="rounded-xl px-4 py-3 border flex items-center justify-between"
                   style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
                <div>
                  <p className="text-sm font-bold" style={{ color: "#3D3D3D" }}>{l.label}</p>
                  <p className="text-[10px]" style={{ color: "#999" }}>{l.desc}</p>
                </div>
                <span style={{ color: "#BABABA" }}>&rarr;</span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
