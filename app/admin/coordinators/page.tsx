import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import BackLink from "@/components/BackLink"
import TestModeBanner from "@/components/TestModeBanner"
import Link from "next/link"
import CoordinatorBlocks, { Assignment } from "@/components/admin/CoordinatorBlocks"

export const dynamic = "force-dynamic"

interface RawRow {
  block_number:   number
  coordinator_id: string
  users:          { display_name: string | null } | { display_name: string | null }[] | null
}

export default async function CoordinatorsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!["admin", "super_admin"].includes(session.user.role)) redirect("/dashboard")

  const [{ data: rawAssignments }, { data: coordinators }] = await Promise.all([
    db.from("coordinator_assignments")
      .select("block_number, coordinator_id, users(display_name)")
      .order("block_number"),
    db.from("users")
      .select("id, display_name")
      .eq("role", "coordinator")
      .eq("is_active", true)
      .order("display_name"),
  ])

  const assignments: Assignment[] = ((rawAssignments ?? []) as RawRow[]).map(a => {
    const user = Array.isArray(a.users) ? (a.users[0] ?? null) : a.users
    return {
      block_number:   a.block_number,
      coordinator_id: a.coordinator_id,
      name:           user?.display_name ?? "Unknown",
    }
  })

  const coveredBlocks = new Set(assignments.map(a => a.block_number)).size

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between" style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">
            Manage Coordinators
          </div>
          <div className="text-white text-[10px] opacity-70">
            {coveredBlocks} of 8 blocks covered · {assignments.length} assignment{assignments.length === 1 ? "" : "s"}
          </div>
        </div>
        <SignOutButton />
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />
      <nav className="px-5 py-2 border-b flex items-center" style={{ borderColor: "#EAEAEA" }}>
        <BackLink fallbackHref="/admin/config" />
      </nav>

      <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full flex flex-col gap-3">
        {(coordinators?.length ?? 0) === 0 ? (
          <p className="text-xs text-center py-6" style={{ color: "#999" }}>
            No active coordinators yet. Add coordinators in <Link href="/admin/users/coordinator"
              style={{ color: "#A6192E", textDecoration: "underline" }}>Manage Users</Link>.
          </p>
        ) : (
          <CoordinatorBlocks
            coordinators={coordinators ?? []}
            assignments={assignments}
          />
        )}
      </main>
    </div>
  )
}
