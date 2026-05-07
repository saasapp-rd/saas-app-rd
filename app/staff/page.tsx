import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import LiveFeed from "@/components/LiveFeed"
import WithMeButton from "@/components/WithMeButton"
import Link from "next/link"

interface Incident {
  id:          string
  level:       string
  reported_at: string
  block_id:    number | null
  room:        string | null
  students:    { first_name: string; last_name: string; grade: number } | null
  reporter:    { display_name: string } | null
}

export default async function StaffPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!["staff", "admin", "super_admin"].includes(session.user.role)) redirect("/dashboard")

  const { data: raw } = await db
    .from("incidents")
    .select("id, level, reported_at, block_id, room, students(first_name, last_name, grade), reporter:reported_by(display_name)")
    .eq("status", "open")
    .order("level",       { ascending: false })
    .order("reported_at", { ascending: true  })

  const incidents = (raw ?? []) as unknown as Incident[]

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between" style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase flex items-center gap-2">
            Staff View
            {incidents.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px]"
                    style={{ background: "rgba(255,255,255,0.25)" }}>
                {incidents.length}
              </span>
            )}
            <LiveFeed />
          </div>
          <div className="text-white text-[10px] opacity-70">{session.user.displayName}</div>
        </div>
        <SignOutButton />
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />
      <nav className="px-5 py-2 border-b flex items-center" style={{ borderColor: "#EAEAEA" }}>
        <Link href="/missing" className="text-xs font-bold" style={{ color: "#A6192E", textDecoration: "none" }}>
          &larr; All Missing Students
        </Link>
      </nav>

      <main className="flex-1 flex flex-col px-5 py-5 gap-4 max-w-lg mx-auto w-full">

        {/* Welfare concern CTA */}
        <Link href="/staff/concern" style={{ textDecoration: "none" }}>
          <div className="rounded-xl p-4 flex items-center gap-3"
               style={{ background: "#FFF0F0", border: "1.5px solid #CE2033" }}>
            <span className="text-xl">&#x26A0;&#xFE0F;</span>
            <div>
              <div className="text-sm font-bold" style={{ color: "#A6192E" }}>Report a Welfare Concern</div>
              <div className="text-[10px]" style={{ color: "#999" }}>
                Student seems unwell, upset, or unsafe
              </div>
            </div>
            <span className="ml-auto text-xs font-bold" style={{ color: "#CE2033" }}>&rarr;</span>
          </div>
        </Link>

        {/* Open incidents — staff can mark "with me" */}
        {incidents.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12 gap-3">
            <div className="text-4xl">&#x2705;</div>
            <p className="text-sm font-bold" style={{ color: "#3D3D3D" }}>All students accounted for</p>
            <p className="text-xs" style={{ color: "#999" }}>No open incidents right now.</p>
          </div>
        ) : (
          <div>
            <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
               style={{ color: "#3D3D3D", opacity: 0.35 }}>
              Open Incidents &mdash; Is a student with you?
            </p>
            <div className="flex flex-col gap-2">
              {incidents.map(inc => {
                const s      = inc.students
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
      </main>
    </div>
  )
}
