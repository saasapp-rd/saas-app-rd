import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import LiveFeed from "@/components/LiveFeed"
import QuickActionsPanel from "@/components/admin/QuickActionsPanel"
import Link from "next/link"

export const dynamic = "force-dynamic"

function norm<T>(val: unknown): T | null {
  if (!val) return null
  return (Array.isArray(val) ? val[0] ?? null : val) as T | null
}

const MGMT_LINKS = [
  { href: "/admin/users",            label: "Manage Users",           desc: "Add, edit, and deactivate accounts by role",              icon: "👥" },
  { href: "/admin/courses",          label: "Manage Courses",         desc: "Create courses, assign teachers, set blocks and rooms",    icon: "📚" },
  { href: "/admin/calendar",         label: "School Calendar",        desc: "Set day types, block rotation, and holidays",             icon: "📅" },
  { href: "/admin/coordinators",     label: "Coordinator Assignments", desc: "Assign coordinators to blocks for each academic period", icon: "🎯" },
  { href: "/admin/import",           label: "CSV Import",             desc: "Upload student roster, teacher list, and class schedule", icon: "📥" },
  { href: "/admin/daily",            label: "Daily Report",           desc: "Today's attendance and missing student log",              icon: "📊" },
  { href: "/analytics",             label: "Analytics",              desc: "Patterns, trends, and attendance data",                   icon: "📈" },
  { href: "/admin/welfare-concerns", label: "Welfare Concerns",       desc: "View all submitted welfare concern reports",              icon: "⚠️" },
  { href: "/admin/settings",         label: "System Settings",        desc: "Academic year, school name, and configuration",          icon: "⚙️" },
]

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!["admin", "super_admin"].includes(session.user.role)) redirect("/dashboard")

  // Open incidents with student info for the live widget
  const { data: openInc } = await db
    .from("incidents")
    .select("id, level, reported_at, student:student_id(id, first_name, last_name, grade)")
    .eq("status", "open")
    .order("level",       { ascending: false })
    .order("reported_at", { ascending: true  })

  // All active students for the action modals
  const { data: allStudents } = await db
    .from("students")
    .select("id, first_name, last_name, grade, call_by")
    .eq("is_active", true)
    .order("last_name")

  const missing  = openInc?.length ?? 0
  const students = (allStudents ?? []) as {
    id: string; first_name: string; last_name: string; grade: number; call_by: string | null
  }[]

  type OpenRow = {
    id: string; level: string; reported_at: string
    student: { id: string; first_name: string; last_name: string; grade: number } | null
  }
  const rows = ((openInc ?? []) as unknown[]).map((r: any) => ({
    id:          r.id,
    level:       r.level,
    reported_at: r.reported_at,
    student:     norm<{ id: string; first_name: string; last_name: string; grade: number }>(r.student),
  })) as OpenRow[]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between"
              style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase flex items-center gap-2">
            Dashboard
            <LiveFeed />
          </div>
          <div className="text-white text-[10px] opacity-70">
            {session.user.displayName ?? session.user.email}
          </div>
        </div>
        <SignOutButton />
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />

      <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full flex flex-col gap-3">

        {/* ── Live widget ── */}
        <div className="rounded-xl border overflow-hidden"
             style={{
               borderColor: missing > 0 ? "#FFCCCC" : "#22C55E",
               background:  missing > 0 ? "#FFF0F0" : "#F0FDF4",
             }}>

          {/* Header — tapping goes to full live view */}
          <Link href="/missing" style={{ textDecoration: "none", display: "block" }}>
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <div>
                <div className="text-[9px] font-bold uppercase tracking-[0.2em] mb-0.5"
                     style={{ color: missing > 0 ? "#A6192E" : "#166534" }}>
                  Right Now
                </div>
                <div className="text-3xl font-black leading-none"
                     style={{ color: missing > 0 ? "#CE2033" : "#166534" }}>
                  {missing}
                </div>
                <div className="text-[10px] mt-0.5"
                     style={{ color: missing > 0 ? "#A6192E" : "#166534", opacity: 0.7 }}>
                  {missing === 0
                    ? "all students accounted for"
                    : missing === 1 ? "student missing" : "students missing"}
                </div>
              </div>
              <span className="text-2xl">{missing > 0 ? "⚠" : "✓"}</span>
            </div>
          </Link>

          {/* Student list — each name links to that student's status page */}
          {rows.length > 0 && (
            <div className="px-4 pb-3 flex flex-col gap-0.5 border-t mt-1"
                 style={{ borderColor: missing > 0 ? "#FFCCCC" : "#22C55E" }}>
              {rows.map(r => (
                <Link
                  key={r.id}
                  href={r.student ? "/students/" + r.student.id : "/coordinator/" + r.id}
                  style={{ textDecoration: "none", display: "block" }}>
                  <div className="flex items-center justify-between py-1.5 px-1 rounded-lg"
                       style={{ background: "transparent" }}>
                    <span className="text-xs font-semibold" style={{ color: "#3D3D3D" }}>
                      {r.student
                        ? r.student.last_name + ", " + r.student.first_name + " — Gr " + r.student.grade
                        : "Unknown student"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {r.level === "elevated" && (
                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase"
                              style={{ background: "#FFE0E0", color: "#A6192E" }}>
                          Elevated
                        </span>
                      )}
                      <span className="text-[10px]" style={{ color: "#BABABA" }}>›</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── Quick Actions (modals) ── */}
        <QuickActionsPanel students={students} />

        {/* ── Management links ── */}
        <p className="text-[9px] font-bold tracking-[0.25em] uppercase mt-1"
           style={{ color: "#3D3D3D", opacity: 0.35 }}>
          Administration
        </p>
        {MGMT_LINKS.map(({ href, label, desc, icon }) => (
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
      </main>
    </div>
  )
}
