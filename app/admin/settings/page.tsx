import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/supabase"
import { getSystemSettings } from "@/lib/systemSettings"
import SignOutButton from "@/components/SignOutButton"
import BackLink from "@/components/BackLink"
import TestModeBanner from "@/components/TestModeBanner"
import SystemSettingsForm from "@/components/admin/SystemSettingsForm"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!["admin", "super_admin"].includes(session.user.role)) redirect("/dashboard")

  const canEdit = session.user.role === "super_admin"

  const [
    settings,
    { count: studentCount },
    { count: courseCount },
    { count: staffCount },
  ] = await Promise.all([
    getSystemSettings(),
    db.from("users").select("id", { count: "exact", head: true })
      .eq("role", "student").eq("is_active", true),
    db.from("courses").select("id", { count: "exact", head: true })
      .eq("is_active", true),
    // Staff = active users who aren't students. (Parents aren't user
    // accounts — they're embedded as parent_email / parent_name on
    // the student row, so role='parent' is essentially unused.)
    db.from("users").select("id", { count: "exact", head: true })
      .eq("is_active", true).neq("role", "student"),
  ])

  const stats = [
    { label: "Active Students", value: studentCount ?? 0 },
    { label: "Active Staff",    value: staffCount   ?? 0 },
    { label: "Active Courses",  value: courseCount  ?? 0 },
  ]

  // ── Timezone display ──────────────────────────────────────────────────────
  const TZ = "America/Los_Angeles"
  const now = new Date()
  const tzLong  = new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "long"  })
    .formatToParts(now).find(p => p.type === "timeZoneName")?.value ?? ""
  const tzShort = new Intl.DateTimeFormat("en-US", { timeZone: TZ, timeZoneName: "short" })
    .formatToParts(now).find(p => p.type === "timeZoneName")?.value ?? ""
  const offsetStr  = tzShort === "PDT" ? "UTC−7" : "UTC−8"
  const nowTimeStr = now.toLocaleTimeString("en-US", {
    timeZone: TZ, hour: "numeric", minute: "2-digit", second: "2-digit",
  })
  const nowDateStr = now.toLocaleDateString("en-US", {
    timeZone: TZ, weekday: "long", month: "long", day: "numeric", year: "numeric",
  })

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between"
              style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">
            System Settings
          </div>
          <div className="text-white text-[10px] opacity-70">
            Seattle Academy · {settings.academic_year}
            {canEdit ? "" : " · read-only"}
          </div>
        </div>
        <SignOutButton />
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />
      <nav className="px-5 py-2 border-b flex items-center gap-4" style={{ borderColor: "#EAEAEA" }}>
        <BackLink fallbackHref="/admin/config" />
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

        {/* Timezone info — read-only, always visible */}
        <div className="rounded-xl border px-4 py-3"
             style={{ background: "#F7F7F7", borderColor: "#EAEAEA" }}>
          <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-1.5"
             style={{ color: "#3D3D3D", opacity: 0.4 }}>
            Server Timezone
          </p>
          <p className="text-sm font-semibold" style={{ color: "#3D3D3D" }}>
            {tzLong} ({tzShort}) &middot; {offsetStr}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: "#999" }}>
            America/Los_Angeles &middot; {nowDateStr} &middot; {nowTimeStr}
          </p>
        </div>

        {!canEdit && (
          <div className="rounded-xl px-4 py-3 text-[10px]"
               style={{ background: "#F4F4F4", borderColor: "#EAEAEA", border: "1px solid #EAEAEA", color: "#666" }}>
            Read-only view. Only super-admins can change system settings.
          </div>
        )}

        <SystemSettingsForm initial={settings} canEdit={canEdit} />
      </main>
    </div>
  )
}
