import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import BackLink from "@/components/BackLink"
import TestModeBanner from "@/components/TestModeBanner"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!["admin", "super_admin"].includes(session.user.role)) redirect("/dashboard")

  // Fetch some live stats for context
  const [{ count: studentCount }, { count: courseCount }, { count: userCount }] = await Promise.all([
    db.from("users").select("id", { count: "exact", head: true }).eq("role", "student").eq("is_active", true),
    db.from("courses").select("id",  { count: "exact", head: true }).eq("is_active", true),
    db.from("users").select("id",    { count: "exact", head: true }).eq("is_active", true),
  ])

  const ACADEMIC_YEAR = "2025–26"
  const SCHOOL_NAME   = "Seattle Academy"

  const stats = [
    { label: "Active Students",  value: studentCount ?? 0 },
    { label: "Active Courses",   value: courseCount  ?? 0 },
    { label: "Active Staff",     value: userCount    ?? 0 },
  ]

  const CONFIG_ITEMS = [
    {
      label:  "Academic Year",
      value:  ACADEMIC_YEAR,
      note:   "Set in code — update when starting a new school year",
      editable: false,
    },
    {
      label:  "School Name",
      value:  SCHOOL_NAME,
      note:   "Displayed in notifications and email footers",
      editable: false,
    },
    {
      label:  "Block Rotation",
      value:  "A/B Day · 8 Blocks",
      note:   "Configure via School Calendar",
      editable: false,
      link:   "/admin/calendar",
    },
    {
      label:  "Coordinator Coverage",
      value:  "Per block assignment",
      note:   "Configure who covers each block",
      editable: false,
      link:   "/admin/coordinators",
    },
    {
      label:  "Email Notifications",
      value:  "Resend (wired)",
      note:   "Send-home emails trigger at Step 3 of the workflow — not yet connected",
      editable: false,
    },
    {
      label:  "Push Notifications",
      value:  "Web Push (active)",
      note:   "Coordinators and deans receive push on new/escalated incidents",
      editable: false,
    },
    {
      label:  "Google SSO",
      value:  "Not configured",
      note:   "Requires GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET from IT",
      editable: false,
    },
    {
      label:  "Veracross Integration",
      value:  "Manual / CSV import",
      note:   "Auto-sync pending API credentials from school admin",
      editable: false,
    },
  ]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between"
              style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">
            System Settings
          </div>
          <div className="text-white text-[10px] opacity-70">
            {SCHOOL_NAME} · {ACADEMIC_YEAR}
          </div>
        </div>
        <SignOutButton />
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />
      <nav className="px-5 py-2 border-b flex items-center gap-4" style={{ borderColor: "#EAEAEA" }}>
        <BackLink fallbackHref="/dashboard" />
        <Link href="/admin/config" className="text-xs"
              style={{ color: "#999", textDecoration: "none" }}>
          Admin
        </Link>
      </nav>

      <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full flex flex-col gap-5">

        {/* Live stats */}
        <div className="grid grid-cols-3 gap-2">
          {stats.map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center border"
                 style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
              <div className="text-2xl font-black" style={{ color: "#A6192E" }}>{s.value}</div>
              <div className="text-[9px] font-bold uppercase tracking-wide mt-0.5"
                   style={{ color: "#999" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Config items */}
        <div>
          <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
             style={{ color: "#3D3D3D", opacity: 0.35 }}>
            Configuration
          </p>
          <div className="flex flex-col gap-1.5">
            {CONFIG_ITEMS.map(item => (
              <div key={item.label} className="rounded-xl px-4 py-3 border"
                   style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wide mb-0.5"
                       style={{ color: "#3D3D3D", opacity: 0.4 }}>
                      {item.label}
                    </p>
                    <p className="text-sm font-semibold" style={{ color: "#3D3D3D" }}>
                      {item.value}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: "#999" }}>
                      {item.note}
                    </p>
                  </div>
                  {item.link && (
                    <Link href={item.link}
                          className="text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0"
                          style={{ background: "#EAEAEA", color: "#3D3D3D", textDecoration: "none" }}>
                      Configure
                    </Link>
                  )}
                  {!item.link && !item.editable && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded flex-shrink-0"
                          style={{ background: "#F4F4F4", color: "#BABABA" }}>
                      Read-only
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl px-4 py-3 border text-center"
             style={{ background: "#FFFBEB", borderColor: "#FDE68A" }}>
          <p className="text-xs font-bold mb-0.5" style={{ color: "#92400E" }}>
            Need to change a setting?
          </p>
          <p className="text-[10px]" style={{ color: "#B45309" }}>
            Most system configuration is currently code-level. Ask your developer to update
            environment variables or settings files.
          </p>
        </div>

      </main>
    </div>
  )
}
