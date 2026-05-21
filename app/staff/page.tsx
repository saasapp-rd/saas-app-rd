import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import LiveFeed from "@/components/LiveFeed"
import WithMeButton from "@/components/WithMeButton"
import WelfareConcernLink from "@/components/WelfareConcernLink"
import QuickActionsPanel from "@/components/admin/QuickActionsPanel"
import Link from "next/link"

interface Incident {
  id:          string
  level:       string
  reported_at: string
  block_id:    number | null
  room:        string | null
  student:     { first_name: string; last_name: string; grade: number; is_active: boolean | null } | null
  reporter:    { display_name: string } | null
}

export default async function StaffPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!["staff", "admin", "super_admin"].includes(session.user.role)) redirect("/dashboard")

  const [{ data: raw }, { data: allStudents }] = await Promise.all([
    db.from("incidents")
      .select("id, level, reported_at, block_id, room, student:student_id(first_name, last_name, grade, is_active), reporter:reported_by(display_name)")
      .eq("status", "open")
      .order("level",       { ascending: false })
      .order("reported_at", { ascending: true  }),
    db.from("users")
      .select("id, first_name, last_name, grade, call_by")
      .eq("role", "student")
      .eq("is_active", true)
      .order("last_name"),
  ])

  const incidents = ((raw ?? []) as unknown as Incident[])
    .filter(i => i.student?.is_active !== false)
  const students = (allStudents ?? []) as {
    id: string; first_name: string; last_name: string; grade: number; call_by: string | null
  }[]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between" style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase flex items-center gap-2">
            Staff View
            <LiveFeed />
          </div>
          <div className="text-white text-[10px] opacity-70">
            {incidents.length === 0 ? "All students accounted for" : `${incidents.length} missing right now`}
          </div>
        </div>
        <SignOutButton />
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />

      <main className="flex-1 flex flex-col px-5 py-5 gap-4 max-w-lg mx-auto w-full">

        {/* Quick actions */}
        {students.length > 0 && <QuickActionsPanel students={students} />}

        {/* Missing students — staff can mark "with me" */}
        {incidents.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12 gap-3">
            <div className="text-4xl">&#x2705;</div>
            <p className="text-sm font-bold" style={{ color: "#3D3D3D" }}>All students accounted for</p>
            <p className="text-xs" style={{ color: "#999" }}>No missing students right now.</p>
          </div>
        ) : (
          <div>
            <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
               style={{ color: "#3D3D3D", opacity: 0.35 }}>
              Missing Students &mdash; Is one with you?
            </p>
            <div className="flex flex-col gap-2">
              {incidents.map(inc => {
                const s      = inc.student
                const isElev = inc.level === "elevated"
                const mins   = Math.floor((Date.now() - new Date(inc.reported_at).getTime()) / 60000)
                return (
                  <div key={inc.id} className="rounded-xl p-3"
                       style={{
                         background: isElev ? "#FFF8F8" : "#FAFAFA",
                         border:     "1.5px solid " + (isElev ? "#CE2033" : "#EAEAEA"),
                         borderLeft: "4px solid "   + (isElev ? "#CE2033" : "#F0C040"),
                       }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <span className="text-sm font-bold" style={{ color: "#3D3D3D" }}>
                          {s ? s.last_name + ", " + s.first_name : "Unknown"}
                        </span>
                        {s && (
                          <span className="text-[10px] ml-1.5" style={{ color: "#999" }}>
                            Gr {s.grade}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold" style={{ color: isElev ? "#CE2033" : "#999" }}>
                        {mins < 1 ? "just now" : mins + "m"}
                      </span>
                    </div>
                    <p className="text-[10px] mb-2" style={{ color: "#999" }}>
                      {inc.block_id ? "Block " + inc.block_id : ""}
                      {inc.room ? " · " + inc.room : ""}
                      {inc.reporter ? " · " + inc.reporter.display_name : ""}
                    </p>
                    <WithMeButton incidentId={inc.id} />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <WelfareConcernLink />
      </main>
    </div>
  )
}
