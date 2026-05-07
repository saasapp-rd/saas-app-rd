import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import Link from "next/link"
import AddUserForm from "@/components/admin/AddUserForm"

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  super_admin: { bg: "#FFF0F0", color: "#A6192E" },
  admin:       { bg: "#FFF0F0", color: "#A6192E" },
  dean:        { bg: "#FFF8E0", color: "#8B6200" },
  coordinator: { bg: "#EEF6FF", color: "#1E5FA6" },
  counselor:   { bg: "#F0FDF4", color: "#166534" },
  teacher:     { bg: "#EAEAEA", color: "#3D3D3D" },
  staff:       { bg: "#EAEAEA", color: "#3D3D3D" },
  student:     { bg: "#EAEAEA", color: "#3D3D3D" },
}

interface User {
  id:           string
  email:        string
  name:         string
  display_name: string | null
  role:         string
  is_active:    boolean
  created_at:   string
}

export default async function UsersPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!["admin", "super_admin"].includes(session.user.role)) redirect("/dashboard")

  const { data } = await db
    .from("users")
    .select("id, email, name, display_name, role, is_active, created_at")
    .eq("is_active", true)
    .order("role")
    .order("name")

  const users = (data ?? []) as User[]

  // Group by role for display
  const byRole: Record<string, User[]> = {}
  users.forEach(u => {
    if (!byRole[u.role]) byRole[u.role] = []
    byRole[u.role].push(u)
  })
  const roleOrder = ["super_admin","admin","dean","coordinator","counselor","teacher","staff","student"]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between" style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">
            Admin &mdash; Users
          </div>
          <div className="text-white text-[10px] opacity-70">{users.length} active staff members</div>
        </div>
        <SignOutButton />
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />
      <nav className="px-5 py-2 border-b flex items-center gap-4" style={{ borderColor: "#EAEAEA" }}>
        <Link href="/admin" className="text-xs font-bold" style={{ color: "#A6192E", textDecoration: "none" }}>
          &larr; Admin
        </Link>
      </nav>

      <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full flex flex-col gap-5">
        <AddUserForm />

        {roleOrder.map(role => {
          const group = byRole[role]
          if (!group?.length) return null
          const style = ROLE_STYLE[role] ?? ROLE_STYLE["staff"]
          return (
            <div key={role}>
              <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
                 style={{ color: "#3D3D3D", opacity: 0.35 }}>
                {role.replace("_", " ")} &mdash; {group.length}
              </p>
              <div className="flex flex-col gap-1.5">
                {group.map(u => (
                  <div key={u.id} className="rounded-xl px-4 py-2.5 border flex items-center justify-between"
                       style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
                    <div>
                      <div className="text-sm font-semibold" style={{ color: "#3D3D3D" }}>
                        {u.display_name ?? u.name}
                      </div>
                      <div className="text-[10px]" style={{ color: "#999" }}>{u.email}</div>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase"
                          style={{ background: style.bg, color: style.color }}>
                      {role.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {users.length === 0 && (
          <p className="text-xs text-center py-8" style={{ color: "#999" }}>
            No users yet. Add staff members above.
          </p>
        )}
      </main>
    </div>
  )
}
