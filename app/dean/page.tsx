import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import Link from "next/link"

interface Incident {
  id:          string
  level:       string
  status:      string
  reported_at: string
  block_id:    number | null
  step_5_logged_at: string | null
  step_6_sent_at:   string | null
  students:  { first_name: string; last_name: string; grade: number } | null
  reporter:  { display_name: string } | null
  resolver:  { display_name: string } | null
}

function minsAgo(d: string) {
  return Math.floor((Date.now() - new Date(d).getTime()) / 60000)
}

export default async function DeanPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!["dean", "admin", "super_admin"].includes(session.user.role)) redirect("/dashboard")

  const { data: raw } = await db
    .from("incidents")
    .select("id, level, status, reported_at, block_id, step_5_logged_at, step_6_sent_at, students(first_name, last_name, grade), reporter:reported_by(display_name), resolver:resolved_by(display_name)")
    .eq("level", "elevated")
    .in("status", ["open", "resolved"])
    .order("reported_at", { ascending: false })

  const incidents  = (raw ?? []) as unknown as Incident[]
  const openElev   = incidents.filter(i => i.status === "open")
  const closedElev = incidents.filter(i => i.status !== "open")

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between" style={{ background: "#8B1020" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">
            Dean View &mdash; Elevated
            {openElev.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px]"
                    style={{ background: "rgba(255,255,255,0.25)" }}>
                {openElev.length}
              </span>
            )}
          </div>
          <div className="text-white text-[10px] opacity-70">{session.user.displayName}</div>
        </div>
        <SignOutButton />
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />
      <nav className="px-5 py-2 border-b flex items-center gap-4" style={{ borderColor: "#EAEAEA" }}>
        <Link href="/missing" className="text-xs font-bold" style={{ color: "#A6192E", textDecoration: "none" }}>
          &larr; All Missing Students
        </Link>
        <Link href="/coordinator" className="text-xs" style={{ color: "#999", textDecoration: "none" }}>
          Coordinator
        </Link>
      </nav>

      <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full flex flex-col gap-5">

        {incidents.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-16 gap-2">
            <p className="text-sm font-bold" style={{ color: "#3D3D3D" }}>No elevated incidents</p>
            <p className="text-xs" style={{ color: "#999" }}>All current incidents are routine.</p>
          </div>
        )}

        {openElev.length > 0 && (
          <div>
            <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
               style={{ color: "#CE2033" }}>
              Open Elevated &mdash; {openElev.length}
            </p>
            <div className="flex flex-col gap-2">
              {openElev.map(inc => {
                const s = inc.students
                return (
                  <Link key={inc.id} href={"/coordinator/" + inc.id} style={{ textDecoration: "none" }}>
                    <div className="rounded-xl p-3"
                         style={{ background: "#FFF8F8", border: "1.5px solid #CE2033", borderLeft: "4px solid #CE2033" }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold" style={{ color: "#3D3D3D" }}>
                          {s ? s.last_name + ", " + s.first_name : "Unknown"}
                          {s ? " (Gr " + s.grade + ")" : ""}
                        </span>
                        <span className="text-xs font-bold" style={{ color: "#CE2033" }}>
                          {minsAgo(inc.reported_at)}m
                        </span>
                      </div>
                      <p className="text-[10px]" style={{ color: "#999" }}>
                        {inc.block_id ? "Block " + inc.block_id : ""}
                        {inc.reporter ? " · " + inc.reporter.display_name : ""}
                        {!inc.step_6_sent_at ? " · Family not yet called" : " · Family called"}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {closedElev.length > 0 && (
          <div>
            <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
               style={{ color: "#3D3D3D", opacity: 0.35 }}>
              Resolved Elevated &mdash; {closedElev.length}
            </p>
            <div className="flex flex-col gap-1.5">
              {closedElev.map(inc => {
                const s = inc.students
                return (
                  <div key={inc.id} className="rounded-xl px-4 py-2.5 border flex items-center justify-between"
                       style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
                    <span className="text-sm font-semibold" style={{ color: "#3D3D3D" }}>
                      {s ? s.last_name + ", " + s.first_name : "Unknown"}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: "#F0FDF4", color: "#166534" }}>
                      Resolved
                    </span>
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
