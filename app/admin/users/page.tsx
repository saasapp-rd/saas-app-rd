import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import Link from "next/link"
import UserSearch, { SearchUser } from "@/components/admin/UserSearch"

export const dynamic = "force-dynamic"

const ROLE_META: {
  role:  string
  label: string
  desc:  string
  bg:    string
  color: string
}[] = [
  { role: "student",     label: "Students",       desc: "Student roster",                                            bg: "#F7F7F7", color: "#3D3D3D" },
  { role: "teacher",     label: "Teachers",       desc: "Classroom teachers",                                        bg: "#F7F7F7", color: "#3D3D3D" },
  { role: "staff",       label: "Staff",          desc: "Non-teaching staff",                                        bg: "#F7F7F7", color: "#3D3D3D" },
  { role: "coordinator", label: "Coordinators",   desc: "Attendance coordinators",                                   bg: "#EEF6FF", color: "#1E5FA6" },
  { role: "counselor",   label: "Counselors",     desc: "School counselors",                                         bg: "#F0FDF4", color: "#166534" },
  { role: "dean",        label: "Deans",          desc: "Dean of students",                                          bg: "#FFF8E0", color: "#8B6200" },
  { role: "admin",       label: "Administrators", desc: "Division leadership — Heads, Dean of Teaching & Learning",  bg: "#FFF0F0", color: "#A6192E" },
  { role: "super_admin", label: "Super Admins",   desc: "System administrators · full access",                       bg: "#FFF0F0", color: "#A6192E" },
]

export default async function UsersPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!["admin", "super_admin"].includes(session.user.role)) redirect("/dashboard")

  // Per-role HEAD counts — avoids PostgREST's 1000-row default cap that was
  // truncating the student count once total user rows passed 1000.
  const counts = await Promise.all(
    ROLE_META.map(async ({ role }) => {
      const [{ count: totalCount }, { count: inactiveCount }] = await Promise.all([
        db.from("users").select("*", { count: "exact", head: true }).eq("role", role),
        db.from("users").select("*", { count: "exact", head: true }).eq("role", role).eq("is_active", false),
      ])
      return { role, total: totalCount ?? 0, inactive: inactiveCount ?? 0 }
    })
  )

  const total    = Object.fromEntries(counts.map(c => [c.role, c.total]))    as Record<string, number>
  const inactive = Object.fromEntries(counts.map(c => [c.role, c.inactive])) as Record<string, number>
  const grandTotal = counts.reduce((s, c) => s + c.total, 0)

  const { count: needsInfoCount } = await db
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("needs_info", true)
    .eq("is_active", true)

  // Slim user list for the search bar. Range bumped past PostgREST's 1000-row
  // default so the search covers everyone, not just the first 1000 rows.
  const { data: searchRows } = await db
    .from("users")
    .select("id, email, display_name, first_name, last_name, role, is_active")
    .range(0, 9999)

  const searchUsers: SearchUser[] = ((searchRows ?? []) as {
    id:            string
    email:         string | null
    display_name:  string | null
    first_name:    string | null
    last_name:     string | null
    role:          string
    is_active:     boolean | null
  }[]).map(u => {
    const fullName = [u.first_name, u.last_name].filter(Boolean).join(" ")
    return {
      id:        u.id,
      name:      u.display_name || fullName || u.email || "Unknown",
      email:     u.email,
      role:      u.role,
      is_active: u.is_active,
    }
  })

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between"
              style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">
            Manage Users
          </div>
          <div className="text-white text-[10px] opacity-70">{grandTotal} members</div>
        </div>
        <SignOutButton />
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />
      <nav className="px-5 py-2 border-b flex items-center" style={{ borderColor: "#EAEAEA" }}>
        <Link href="/admin/config" className="text-xs font-bold"
              style={{ color: "#A6192E", textDecoration: "none" }}>
          &larr; Admin
        </Link>
      </nav>

      <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full flex flex-col gap-3">

        {(needsInfoCount ?? 0) > 0 && (
          <Link href="/admin/users/needs-info" style={{ textDecoration: "none" }}>
            <div className="rounded-xl px-4 py-3 flex items-center justify-between"
                 style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold" style={{ color: "#92400E" }}>
                  {needsInfoCount} {needsInfoCount === 1 ? "person was" : "people were"} added from CSV imports
                </p>
                <p className="text-[10px]" style={{ color: "#78350F" }}>
                  Missing email and contact info — review and complete
                </p>
              </div>
              <span style={{ color: "#92400E" }}>&rarr;</span>
            </div>
          </Link>
        )}

        <UserSearch users={searchUsers} />

        <p className="text-[9px] font-bold tracking-[0.25em] uppercase mt-2"
           style={{ color: "#3D3D3D", opacity: 0.35 }}>
          Or select a group to view or add members
        </p>

        {ROLE_META.map(({ role, label, desc, bg, color }) => {
          const count       = total[role]    ?? 0
          const inactiveNum = inactive[role] ?? 0
          return (
            <Link key={role} href={"/admin/users/" + role} style={{ textDecoration: "none" }}>
              <div className="rounded-xl px-4 py-4 border flex items-center justify-between"
                   style={{ background: bg, borderColor: "#EAEAEA" }}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold" style={{ color }}>{label}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="text-[10px]" style={{ color: "#999" }}>{desc}</div>
                    {inactiveNum > 0 && (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: "#FEE2E2", color: "#CE2033" }}>
                        {inactiveNum} inactive
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                  <div className="text-2xl font-black" style={{ color }}>{count}</div>
                  <span style={{ color: "#BABABA" }}>&rarr;</span>
                </div>
              </div>
            </Link>
          )
        })}

        <Link href="/admin/users/all" style={{ textDecoration: "none" }}>
          <div className="rounded-xl px-4 py-4 border flex items-center justify-between mt-2"
               style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold" style={{ color: "#3D3D3D" }}>All Users</div>
              <div className="text-[10px] mt-0.5" style={{ color: "#999" }}>
                Combined list across every role
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0 ml-3">
              <div className="text-2xl font-black" style={{ color: "#3D3D3D" }}>{grandTotal}</div>
              <span style={{ color: "#BABABA" }}>&rarr;</span>
            </div>
          </div>
        </Link>
      </main>
    </div>
  )
}
