import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import Link from "next/link"
import AddUserForm from "@/components/admin/AddUserForm"

const VALID_ROLES = [
  "student","teacher","staff","coordinator","counselor","dean","admin","super_admin",
]

const ROLE_LABEL: Record<string, string> = {
  student:     "Students",
  teacher:     "Teachers",
  staff:       "Staff",
  coordinator: "Coordinators",
  counselor:   "Counselors",
  dean:        "Deans",
  admin:       "Admins",
  super_admin: "Super Admins",
}

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
  display_name: string | null
  role:         string
  is_active:    boolean
  created_at:   string
}

export default async function UserRolePage({
  params,
}: {
  params: Promise<{ role: string }>
}) {
  const { role } = await params
  if (!VALID_ROLES.includes(role)) notFound()

  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!["admin", "super_admin"].includes(session.user.role)) redirect("/dashboard")

  const { data } = await db
    .from("users")
    .select("id, email, display_name, role, is_active, created_at")
    .eq("role", role)
    .eq("is_active", true)
    .order("display_name")

  const users  = (data ?? []) as User[]
  const label  = ROLE_LABEL[role] ?? role
  const style  = ROLE_STYLE[role] ?? ROLE_STYLE["staff"]

  // Students are managed via Veracross import, not manually added
  const isStudent = role === "student"

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between"
              style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">
            {label}
          </div>
          <div className="text-white text-[10px] opacity-70">
            {users.length} active member{users.length !== 1 ? "s" : ""}
          </div>
        </div>
        <SignOutButton />
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />
      <nav className="px-5 py-2 border-b flex items-center gap-4" style={{ borderColor: "#EAEAEA" }}>
        <Link href="/admin/users" className="text-xs font-bold"
              style={{ color: "#A6192E", textDecoration: "none" }}>
          &larr; All Roles
        </Link>
        <Link href="/admin" className="text-xs"
              style={{ color: "#999", textDecoration: "none" }}>
          Admin
        </Link>
      </nav>

      <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full flex flex-col gap-5">

        {/* Add form — not shown for students (managed via import) */}
        {!isStudent && <AddUserForm defaultRole={role} />}

        {isStudent && (
          <div className="rounded-xl px-4 py-3 border text-center"
               style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
            <p className="text-xs font-bold mb-0.5" style={{ color: "#3D3D3D" }}>
              Student roster is managed via Veracross
            </p>
            <p className="text-[10px]" style={{ color: "#999" }}>
              Students are imported automatically. Contact IT to update the roster.
            </p>
          </div>
        )}

        {/* User list */}
        {users.length === 0 ? (
          <p className="text-xs text-center py-6" style={{ color: "#999" }}>
            No {label.toLowerCase()} yet.
            {!isStudent && " Add one above."}
          </p>
        ) : (
          <div>
            <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
               style={{ color: "#3D3D3D", opacity: 0.35 }}>
              {label} &mdash; {users.length}
            </p>
            <div className="flex flex-col gap-1.5">
              {users.map(u => (
                <div key={u.id}
                     className="rounded-xl px-4 py-2.5 border flex items-center justify-between"
                     style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate" style={{ color: "#3D3D3D" }}>
                      {u.display_name ?? u.email}
                    </div>
                    <div className="text-[10px] truncate" style={{ color: "#999" }}>
                      {u.email}
                    </div>
                  </div>
                  <span className="ml-3 flex-shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase"
                        style={{ background: style.bg, color: style.color }}>
                    {role.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
