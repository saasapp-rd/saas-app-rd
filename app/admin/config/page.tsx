import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import Link from "next/link"

export const dynamic = "force-dynamic"

const CONFIG_ALLOWED = ["admin", "super_admin", "dean", "coordinator", "counselor"]

type Role = "super_admin" | "admin" | "dean" | "coordinator" | "counselor"

interface MgmtLink {
  href:        string
  label:       string
  labelByRole?: Partial<Record<Role, string>>   // override label per role
  desc:        string
  icon:        string
  roles:       Role[]                            // who sees this tile
}

const MGMT_LINKS: MgmtLink[] = [
  // ── Setup ─────────────────────────────────────────────────────
  { href: "/admin/users",            label: "Manage Users",
    desc: "Add, edit, and deactivate accounts by role",
    icon: "👥", roles: ["super_admin","admin"] },
  { href: "/admin/courses",          label: "Manage Courses",
    desc: "Create courses, assign teachers, set blocks and rooms",
    icon: "📚", roles: ["super_admin","admin"] },
  { href: "/admin/calendar",         label: "Manage School Calendar",
    labelByRole: { dean: "View School Calendar", coordinator: "View School Calendar" },
    desc: "Set day types, block rotation, and holidays",
    icon: "📅", roles: ["super_admin","admin","dean","coordinator"] },
  { href: "/admin/coordinators",     label: "Manage Coordinators",
    desc: "Global block assignments — overrides live in the calendar",
    icon: "🎯", roles: ["super_admin","admin","dean"] },
  { href: "/admin/counselors",       label: "Manage Counselors",
    desc: "Counselor caseloads — assign students to counselors (multi-counselor OK)",
    icon: "🧑‍⚕️", roles: ["super_admin","admin","dean"] },
  // ── Operations ────────────────────────────────────────────────
  { href: "/admin/daily",            label: "Daily Report",
    desc: "Today's attendance and missing student log",
    icon: "📊", roles: ["super_admin","admin","dean","coordinator","counselor"] },
  { href: "/admin/welfare-concerns", label: "Welfare Concerns",
    desc: "View all submitted welfare concern reports",
    icon: "⚠️", roles: ["super_admin","admin","dean","counselor"] },
  { href: "/admin/review-queue",     label: "Review Queue",
    desc: "Data-quality issues from imports needing admin attention",
    icon: "📝", roles: ["super_admin","admin"] },
  // ── Batch & System ────────────────────────────────────────────
  { href: "/admin/import",           label: "CSV Import",
    desc: "Upload Veracross faculty, students, parents — super-admin only",
    icon: "📥", roles: ["super_admin"] },
  { href: "/admin/settings",         label: "System Settings",
    desc: "Academic year, notifications, SSO + Veracross integration",
    icon: "⚙️", roles: ["super_admin","admin"] },
]

export default async function AdminConfigPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  const role = session.user.role
  if (!CONFIG_ALLOWED.includes(role)) redirect("/dashboard")

  const visible = MGMT_LINKS.filter(l => l.roles.includes(role as Role))

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between"
              style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">
            Administration
          </div>
          <div className="text-white text-[10px] opacity-70">
            {session.user.displayName ?? session.user.email}
          </div>
        </div>
        <SignOutButton />
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />

      <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full flex flex-col gap-3">
        <p className="text-[9px] font-bold tracking-[0.25em] uppercase"
           style={{ color: "#3D3D3D", opacity: 0.35 }}>
          Administration
        </p>
        {visible.map(({ href, label, labelByRole, desc, icon }) => {
          const shown = labelByRole?.[role as Role] ?? label
          return (
            <Link key={href} href={href} style={{ textDecoration: "none" }}>
              <div className="rounded-xl px-4 py-4 border flex items-center gap-4"
                   style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
                <span className="text-2xl">{icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold" style={{ color: "#3D3D3D" }}>{shown}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: "#999" }}>{desc}</div>
                </div>
                <span style={{ color: "#BABABA" }}>&rarr;</span>
              </div>
            </Link>
          )
        })}
      </main>
    </div>
  )
}
