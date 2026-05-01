import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import Link from "next/link"

const MENU = [
  { icon: "👥", title: "User Management",         desc: "Add, edit, assign roles",           href: "#" },
  { icon: "🎓", title: "Student Management",       desc: "Add, edit, move between classes",   href: "#" },
  { icon: "📋", title: "CSV Import",               desc: "Upload roster, schedule, calendar", href: "#" },
  { icon: "📅", title: "Coordinator Assignments",  desc: "Set who covers which block",        href: "#" },
  { icon: "📊", title: "Pattern Dashboard",        desc: "All students, all data",            href: "/dean" },
  { icon: "🚨", title: "Active Incidents",         desc: "All open incidents",                href: "/missing" },
  { icon: "🎨", title: "Design Lab",               desc: "Brand & design reference",          href: "/design-lab" },
]

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!["admin", "super_admin"].includes(session.user.role)) redirect("/dashboard")

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between" style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">Admin</div>
          <div className="text-white text-[10px] opacity-70">SAAS RD App</div>
        </div>
        <SignOutButton />
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />
      <nav className="px-5 py-2 border-b flex items-center" style={{ borderColor: "#EAEAEA" }}>
        <Link href="/missing" className="text-xs font-bold" style={{ color: "#A6192E", textDecoration: "none" }}>
          &larr; All Missing Students
        </Link>
      </nav>

      <main className="flex-1 flex flex-col px-5 py-5 gap-3 max-w-lg mx-auto w-full">
        <h1 className="text-base font-bold" style={{ color: "#3D3D3D" }}>System Administration</h1>
        {MENU.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="flex items-center gap-4 px-4 py-4 rounded-xl border transition-all"
            style={{ background: "#F7F7F7", borderColor: "#EAEAEA", textDecoration: "none" }}
          >
            <span className="text-2xl">{item.icon}</span>
            <div>
              <div className="text-sm font-bold" style={{ color: "#3D3D3D" }}>{item.title}</div>
              <div className="text-[10px]" style={{ color: "#999" }}>{item.desc}</div>
            </div>
          </Link>
        ))}
      </main>
    </div>
  )
}
