import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import BackLink from "@/components/BackLink"
import TestModeBanner from "@/components/TestModeBanner"
import Link from "next/link"
import UserList, { UserRow } from "@/components/admin/UserList"

export const dynamic = "force-dynamic"

interface UserRecord {
  id:             string
  email:          string | null
  display_name:   string | null
  first_name:     string | null
  last_name:      string | null
  phone:          string | null
  business_phone: string | null
  role:           string
  roles:          string[] | null
  is_active:      boolean | null
  veracross_id:   string | null
  dean_grades:    number[] | null
  job_title:      string | null
  needs_info:     boolean | null
}

export default async function NeedsInfoPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!["admin", "super_admin"].includes(session.user.role)) redirect("/dashboard")

  const { data } = await db
    .from("users")
    .select("id, email, display_name, first_name, last_name, phone, business_phone, role, roles, is_active, veracross_id, dean_grades, job_title, needs_info")
    .eq("needs_info", true)
    .eq("is_active", true)
    .order("last_name")
    .order("first_name")

  const users: UserRow[] = ((data ?? []) as UserRecord[]).map(u => {
    const fullName = [u.first_name, u.last_name].filter(Boolean).join(" ")
    return {
      id:             u.id,
      email:          u.email ?? "",
      display_name:   u.display_name || fullName || null,
      first_name:     u.first_name,
      last_name:      u.last_name,
      phone:          u.phone,
      business_phone: u.business_phone,
      role:           u.role,
      roles:          u.roles,
      is_active:      u.is_active,
      veracross_id:   u.veracross_id,
      dean_grades:    u.dean_grades,
      job_title:      u.job_title,
      needs_info:     u.needs_info,
    }
  })

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between" style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">
            People Needing Info
          </div>
          <div className="text-white text-[10px] opacity-70">
            {users.length} added from CSV imports
          </div>
        </div>
        <SignOutButton />
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />
      <nav className="px-5 py-2 border-b flex items-center" style={{ borderColor: "#EAEAEA" }}>
        <BackLink fallbackHref="/admin/users" />
      </nav>

      <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full flex flex-col gap-4">

        <div className="rounded-xl px-4 py-3 text-[10px]"
             style={{ background: "#FFFBEB", border: "1px solid #FDE68A", color: "#78350F" }}>
          These accounts were auto-created during course imports because they were
          referenced as teachers but didn&apos;t exist in the system. Add their email
          address (required for login) and other contact info. Saving an email clears
          this flag automatically.
        </div>

        {users.length === 0 ? (
          <p className="text-xs text-center py-8" style={{ color: "#999" }}>
            All caught up — no accounts need info.
          </p>
        ) : (
          <UserList
            users={users}
            currentUserId={session.user.userId}
            label="People"
            role=""
          />
        )}
      </main>
    </div>
  )
}
