import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import LiveFeed from "@/components/LiveFeed"
import WelfareConcernLink from "@/components/WelfareConcernLink"
import Link from "next/link"

export const dynamic = "force-dynamic"

const LINKS = [
  {
    href:  "/admin/users",
    label: "Manage Users",
    desc:  "Add, edit, or deactivate accounts by role",
    icon:  "👥",
  },
  {
    href:  "/admin/import",
    label: "CSV Import",
    desc:  "Upload student roster, teacher list, and class schedule",
    icon:  "📥",
  },
  {
    href:  "/admin/daily",
    label: "Daily Summary",
    desc:  "Today\'s attendance overview",
    icon:  "📅",
  },
]

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!["admin", "super_admin"].includes(session.user.role)) redirect("/dashboard")

  const { count: missingCount } = await db
    .from("incidents")
    .select("id", { count: "exact", head: true })
    .eq("status", "open")

  const missing = missingCount ?? 0

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between"
              style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase flex items-center gap-2">
            Admin
            <LiveFeed />
          </div>
          <div className="text-white text-[10px] opacity-70">
            {session.user.displayName ?? session.user.email}
          </div>
        </div>
        <SignOutButton />
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />
      <nav className="px-5 py-2 border-b flex items-center gap-4" style={{ borderColor: "#EAEAEA" }}>
        <Link href="/dashboard" className="text-xs font-bold"
              style={{ color: "#A6192E", textDecoration: "none" }}>
          Dashboard
        </Link>
        <Link href="/missing" className="text-xs"
              style={{ color: "#999", textDecoration: "none" }}>
          Live View
        </Link>
        <Link href="/analytics" className="text-xs"
              style={{ color: "#999", textDecoration: "none" }}>
          Analytics
        </Link>
      </nav>

      <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full flex flex-col gap-3">

        {/* Live widget */}
        <Link href="/missing" style={{ textDecoration: "none" }}>
          <div className="rounded-xl px-4 py-4 border flex items-center justify-between"
               style={{
                 background:   missing > 0 ? "#FFF0F0" : "#F0FDF4",
                 borderColor:  missing > 0 ? "#FFCCCC" : "#22C55E",
               }}>
            <div>
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] mb-0.5"
                   style={{ color: missing > 0 ? "#A6192E" : "#166534" }}>
                Right Now
              </div>
              <div className="text-2xl font-black"
                   style={{ color: missing > 0 ? "#CE2033" : "#166534" }}>
                {missing}
              </div>
              <div className="text-[10px]" style={{ color: missing > 0 ? "#A6192E" : "#166534", opacity: 0.7 }}>
                {missing === 1 ? "student missing" : missing === 0 ? "all students accounted for" : "students missing"}
              </div>
            </div>
            <span className="text-lg" style={{ color: missing > 0 ? "#CE2033" : "#22C55E" }}>
              {missing > 0 ? "⚠" : "✓"}
            </span>
          </div>
        </Link>

        {LINKS.map(({ href, label, desc, icon }) => (
          <Link key={href} href={href} style={{ textDecoration: "none" }}>
            <div className="rounded-xl px-4 py-4 border flex items-center gap-4"
                 style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
              <span className="text-2xl">{icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold" style={{ color: "#3D3D3D" }}>{label}</div>
                <div className="text-[10px] mt-0.5" style={{ color: "#999" }}>{desc}</div>
              </div>
              <span style={{ color: "#BABABA" }}>&rarr;</span>
            </div>
          </Link>
        ))}

        <WelfareConcernLink />
      </main>
    </div>
  )
}
