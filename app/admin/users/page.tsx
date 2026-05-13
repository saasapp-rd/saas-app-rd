import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import Link from "next/link"

// Always fetch live data — never serve a cached count
export const dynamic = "force-dynamic"

const ROLE_META: {
  role:  string
  label: string
  desc:  string
  bg:    string
  color: string
}[] = [
  { role: "student",     label: "Students",     desc: "Student roster",            bg: "#F7F7F7", color: "#3D3D3D" },
  { role: "teacher",     label: "Teachers",     desc: "Classroom teachers",        bg: "#F7F7F7", color: "#3D3D3D" },
  { role: "staff",       label: "Staff",        desc: "Non-teaching staff",        bg: "#F7F7F7", color: "#3D3D3D" },
  { role: "coordinator", label: "Coordinators", desc: "Attendance coordinators",   bg: "#EEF6FF", color: "#1E5FA6" },
  { role: "counselor",   label: "Counselors",   desc: "School counselors",         bg: "#F0FDF4", color: "#166534" },
  { role: "dean",        label: "Deans",        desc: "Dean of students",          bg: "#FFF8E0", color: "#8B6200" },
  { role: "admin",       label: "Admins",       desc: "System administrators",     bg: "#FFF0F0", color: "#A6192E" },
  { role: "super_admin", label: "Super Admins", desc: "Full access",               bg: "#FFF0F0", color: "#A6192E" },
]

export default async function UsersPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!["admin", "super_admin"].includes(session.user.role)) redirect("/dashboard")

  // Count active users per role (neq false also includes any remaining NULLs defensively)
  const { data } = await db
    .from("users")
    .select("role, is_active")

  const counts: Record<string, number> = {}
  for (const u of data ?? []) {
    if (u.is_active === false) continue
    counts[u.role] = (counts[u.role] ?? 0) + 1
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between"
              style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">
            Manage Users
          </div>
          <div className="text-white text-[10px] opacity-70">{total} active members</div>
        </div>
        <SignOutButton />
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />
      <nav className="px-5 py-2 border-b flex items-center" style={{ borderColor: "#EAEAEA" }}>
        <Link href="/admin" className="text-xs font-bold"
              style={{ color: "#A6192E", textDecoration: "none" }}>
          &larr; Admin
        </Link>
      </nav>

      <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full flex flex-col gap-3">
        <h1 className="text-2xl font-bold" style={{ color: "#3D3D3D" }}>
          Manage Users
        </h1>
        <p className="text-sm" style={{ color: "#999" }}>
          Select a group to view or add members
        </p>

        {ROLE_META.map(({ role, label, desc, bg, color }) => {
          const count = counts[role] ?? 0
          return (
            <Link key={role} href={"/admin/users/" + role} style={{ textDecoration: "none" }}>
              <div className="rounded-xl px-4 py-4 border flex items-center justify-between"
                   style={{ background: bg, borderColor: "#EAEAEA" }}>
                <div>
                  <div className="text-sm font-bold" style={{ color }}>{label}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: "#999" }}>{desc}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-2xl font-black" style={{ color }}>{count}</div>
                  <span style={{ color: "#BABABA" }}>&rarr;</span>
                </div>
              </div>
            </Link>
          )
        })}
      </main>
    </div>
  )
}
