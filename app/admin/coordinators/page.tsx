import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import Link from "next/link"
import CoordinatorForm from "@/components/admin/CoordinatorForm"

interface Assignment {
  block_number:   number
  coordinator_id: string
  users:          { display_name: string } | null
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

  // Supabase returns the joined row as an array; normalise to single object | null
  const assignments: Assignment[] = (rawAssignments ?? []).map((a: any) => ({
    block_number:   a.block_number,
    coordinator_id: a.coordinator_id,
    users: Array.isArray(a.users) ? (a.users[0] ?? null) : (a.users ?? null),
  }))

  const allBlocks  = [1,2,3,4,5,6,7,8]
  const assignedMap = Object.fromEntries(
    assignments.map(a => [a.block_number, a.users?.display_name ?? "Unknown"])
  )

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between" style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">Admin &mdash; Coordinators</div>
          <div className="text-white text-[10px] opacity-70">{assignments.length} of 8 blocks assigned</div>
        </div>
        <SignOutButton />
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />
      <nav className="px-5 py-2 border-b flex items-center" style={{ borderColor: "#EAEAEA" }}>
        <Link href="/admin" className="text-xs font-bold" style={{ color: "#A6192E", textDecoration: "none" }}>
          &larr; Admin
        </Link>
      </nav>

      <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full flex flex-col gap-5">
        <CoordinatorForm
          coordinators={coordinators ?? []}
          assignments={assignments}
        />

        <div>
          <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2" style={{ color: "#3D3D3D", opacity: 0.35 }}>
            Block Assignments
          </p>
          <div className="flex flex-col gap-1.5">
            {allBlocks.map(b => {
              const name = assignedMap[b]
              return (
                <div key={b} className="rounded-xl px-4 py-2.5 border flex items-center justify-between"
                     style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
                  <span className="text-sm font-bold" style={{ color: "#3D3D3D" }}>Block {b}</span>
                  <span className="text-xs"
                        style={{ color: name ? "#3D3D3D" : "#999", fontWeight: name ? 600 : 400 }}>
                    {name ?? "Unassigned"}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
