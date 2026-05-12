import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import Link from "next/link"
import AddUserForm from "@/components/admin/AddUserForm"
import UserRowActions from "@/components/admin/UserRowActions"

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

interface User {
  id:           string
  email:        string
  display_name: string | null
  role:         string
  is_active:    boolean
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
    .select("id, email, display_name, role, is_active")
    .eq("role", role)
    .eq("is_active", true)
    .order("display_name")

  const users     = (data ?? []) as User[]
  const label     = ROLE_LABEL[role] ?? role
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

        {users.length === 0 ? (
          <p className="text-xs text-center py-6" style={{ color: "#999" }}>
            No {label.toLowerCase()} yet.{!isStudent && " Add one above."}
          </p>
        ) : (
          <div>
            <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
               style={{ color: "#3D3D3D", opacity: 0.35 }}>
              {label} &mdash; {users.length}
            </p>
            <div className="flex flex-col gap-1.5">
              {users.map(u => (
                <UserRowActions
                  key={u.id}
                  id={u.id}
                  displayName={u.display_name ?? u.email}
                  email={u.email}
                  role={u.role}
                  isSelf={u.id === session.user.userId}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
