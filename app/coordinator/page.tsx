import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import LiveFeed from "@/components/LiveFeed"
import Link from "next/link"
import TriageCard from "@/components/coordinator/TriageCard"

interface Incident {
  id:                  string
  level:               "routine" | "elevated"
  status:              string
  reported_at:         string
  block_id:            number | null
  room:                string | null
  step_1_sent_at:      string | null
  step_2_sent_at:      string | null
  step_3_expires_at:   string | null
  step_4_logged_at:    string | null
  step_5_logged_at:    string | null
  step_6_sent_at:      string | null
  suppress_email_home: boolean
  students:  { first_name: string; last_name: string; grade: number } | null
  reporter:  { display_name: string } | null
}

function minsAgo(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
}

function currentStep(inc: Incident): number {
  if (inc.step_6_sent_at)    return 6
  if (inc.step_5_logged_at)  return 5
  if (inc.step_4_logged_at)  return 4
  if (inc.step_3_expires_at) return 3
  if (inc.step_2_sent_at)    return 2
  if (inc.step_1_sent_at)    return 1
  return 0
}

export default async function CoordinatorPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!["coordinator", "dean", "admin", "super_admin"].includes(session.user.role))
    redirect("/dashboard")

  const { data: raw } = await db
    .from("incidents")
    .select("id, level, status, reported_at, block_id, room, step_1_sent_at, step_2_sent_at, step_3_expires_at, step_4_logged_at, step_5_logged_at, step_6_sent_at, suppress_email_home, students(first_name, last_name, grade), reporter:reported_by(display_name)")
    .eq("status", "open")
    .order("level",       { ascending: false })
    .order("reported_at", { ascending: true  })

  const incidents = (raw ?? []) as unknown as Incident[]
  const triage    = incidents.filter(i => !i.step_1_sent_at)
  const workflow  = incidents.filter(i =>  i.step_1_sent_at)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between" style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase flex items-center gap-2">
            Coordinator
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

      <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full flex flex-col gap-6">

        {incidents.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-16 gap-3">
            <div className="text-4xl">&#x2705;</div>
            <p className="text-sm font-bold" style={{ color: "#3D3D3D" }}>All clear</p>
            <p className="text-xs" style={{ color: "#999" }}>No open incidents to review.</p>
          </div>
        )}

        {triage.length > 0 && (
          <div>
            <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
               style={{ color: "#8B6200", opacity: 0.8 }}>
              Needs Review &mdash; {triage.length}
            </p>
            <div className="flex flex-col gap-2">
              {triage.map(inc => {
                const s = inc.students
                return (
                  <TriageCard
                    key={inc.id}
                    id={inc.id}
                    studentName={s ? s.last_name + ", " + s.first_name : "Unknown"}
                    grade={s?.grade ?? 0}
                    blockId={inc.block_id}
                    room={inc.room}
                    minsAgo={minsAgo(inc.reported_at)}
                    reporter={inc.reporter?.display_name ?? null}
                    suppressEmail={inc.suppress_email_home}
                  />
                )
              })}
            </div>
          </div>
        )}

        {workflow.length > 0 && (
          <div>
            <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
               style={{ color: "#3D3D3D", opacity: 0.35 }}>
              In Workflow &mdash; {workflow.length}
            </p>
            <div className="flex flex-col gap-2">
              {workflow.map(inc => {
                const s      = inc.students
                const step   = currentStep(inc)
                const isElev = inc.level === "elevated"

                return (
                  <Link key={inc.id} href={"/coordinator/" + inc.id} style={{ textDecoration: "none" }}>
                    <div
                      className="rounded-xl p-3"
                      style={{
                        background: isElev ? "#FFF8F8" : "#FAFAFA",
                        border:     "1.5px solid " + (isElev ? "#CE2033" : "#EAEAEA"),
                        borderLeft: "4px solid "   + (isElev ? "#CE2033" : "#F0C040"),
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isElev && (
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                                  style={{ background: "#FFF0F0", color: "#A6192E" }}>
                              ELEVATED
                            </span>
                          )}
                          <span className="text-sm font-bold" style={{ color: "#3D3D3D" }}>
                            {s ? s.last_name + ", " + s.first_name : "Unknown"}
                          </span>
                        </div>
                        <span className="text-xs" style={{ color: "#999" }}>
                          {minsAgo(inc.reported_at)}m &rarr;
                        </span>
                      </div>
                      <p className="text-[10px] mt-0.5" style={{ color: "#999" }}>
                        {inc.block_id ? "Block " + inc.block_id : ""}
                        {" · Step " + step + " of 6"}
                        {isElev ? " · Elevated" : ""}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
