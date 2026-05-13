import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import Link from "next/link"
import LiveFeed from "@/components/LiveFeed"
import WelfareConcernLink from "@/components/WelfareConcernLink"

const ALLOWED = ["coordinator","dean","admin","super_admin"]

interface IncidentRow {
  id:          string
  level:       string
  status:      string
  reported_at: string
  block_id:    number | null
  student:     { id: string; first_name: string; last_name: string; grade: number } | null
}

interface StudentStat {
  id:         string
  name:       string
  grade:      number
  total:      number
  last30:     number
  elevated:   number
  lastDate:   string
}

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"]

export default async function DeanPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!ALLOWED.includes(session.user.role)) redirect("/dashboard")

  const now      = Date.now()
  const days90   = new Date(now - 90 * 86400000).toISOString()
  const days30   = new Date(now - 30 * 86400000).toISOString()

  const { data: incidents } = await db
    .from("incidents")
    .select("id, level, status, reported_at, block_id, student:student_id(id, first_name, last_name, grade)")
    .gte("reported_at", days90)
    .order("reported_at", { ascending: false })

  const rows = (incidents ?? []) as unknown as IncidentRow[]

  // Open elevated right now
  const openElev = rows.filter(r => r.status === "open" && r.level === "elevated")

  // Per-student stats (last 90 days)
  const byStudent: Record<string, StudentStat> = {}
  for (const r of rows) {
    const s = r.student
    if (!s) continue
    if (!byStudent[s.id]) {
      byStudent[s.id] = { id: s.id, name: s.last_name + ", " + s.first_name, grade: s.grade, total: 0, last30: 0, elevated: 0, lastDate: r.reported_at }
    }
    byStudent[s.id].total++
    if (r.reported_at >= days30)         byStudent[s.id].last30++
    if (r.level === "elevated")           byStudent[s.id].elevated++
  }

  // High-frequency: 3+ incidents in 30 days
  const highFreq = Object.values(byStudent)
    .filter(s => s.last30 >= 3)
    .sort((a, b) => b.last30 - a.last30)
    .slice(0, 10)

  // Day-of-week breakdown (last 90 days)
  const dayCount  = Array(7).fill(0)
  const blockCount: Record<number, number> = {}
  for (const r of rows) {
    const d = new Date(r.reported_at).getDay()
    dayCount[d]++
    if (r.block_id) {
      blockCount[r.block_id] = (blockCount[r.block_id] ?? 0) + 1
    }
  }
  const maxDay   = Math.max(...dayCount, 1)
  const maxBlock = Math.max(...Object.values(blockCount), 1)

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  const isCoord = session.user.role === "coordinator"

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between"
              style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">
            Dean View
          </div>
          <div className="text-white text-[10px] opacity-70">
            Patterns &amp; attendance analytics
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LiveFeed />
          <SignOutButton />
        </div>
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />
      <nav className="px-5 py-2 border-b flex items-center gap-4" style={{ borderColor: "#EAEAEA" }}>
        <Link href="/dashboard" className="text-xs font-bold"
              style={{ color: "#A6192E", textDecoration: "none" }}>
          Dashboard
        </Link>
        <Link href="/missing" className="text-xs"
              style={{ color: "#999", textDecoration: "none" }}>
          Live View
        </Link>
        <Link href="/analytics" className="text-xs"
              style={{ color: "#999", textDecoration: "none" }}>
          Analytics
        </Link>
      </nav>

      <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full flex flex-col gap-6">

        {/* Open elevated right now */}
        {openElev.length > 0 && (
          <div>
            <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
               style={{ color: "#CE2033" }}>
              Elevated Open Now — {openElev.length}
            </p>
            <div className="flex flex-col gap-1.5">
              {openElev.map(r => (
                <Link key={r.id} href={"/coordinator/" + r.id} style={{ textDecoration: "none" }}>
                  <div className="rounded-xl px-4 py-3 border flex items-center gap-3"
                       style={{ background: "#FFF0F0", borderColor: "#FFCCCC", borderLeft: "3px solid #CE2033" }}>
                    <div className="flex-1">
                      <p className="text-sm font-bold" style={{ color: "#3D3D3D" }}>
                        {r.student ? r.student.last_name + ", " + r.student.first_name : "Unknown"}
                        <span className="ml-1.5 text-[10px] font-normal" style={{ color: "#999" }}>
                          Gr {r.student?.grade ?? "?"}
                        </span>
                      </p>
                      <p className="text-[10px]" style={{ color: "#999" }}>
                        {fmtDate(r.reported_at)}
                        {r.block_id ? " · Block " + r.block_id : ""}
                      </p>
                    </div>
                    <span style={{ color: "#BABABA" }}>&rarr;</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl p-3 text-center" style={{ background: "#F7F7F7" }}>
            <div className="text-2xl font-black" style={{ color: "#3D3D3D" }}>{rows.length}</div>
            <div className="text-[9px] font-bold uppercase tracking-wide opacity-50">90-Day Total</div>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: "#F7F7F7" }}>
            <div className="text-2xl font-black"
                 style={{ color: rows.filter(r => r.level === "elevated").length > 0 ? "#CE2033" : "#3D3D3D" }}>
              {rows.filter(r => r.level === "elevated").length}
            </div>
            <div className="text-[9px] font-bold uppercase tracking-wide opacity-50">Elevated</div>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: "#F7F7F7" }}>
            <div className="text-2xl font-black"
                 style={{ color: highFreq.length > 0 ? "#8B6200" : "#3D3D3D" }}>
              {highFreq.length}
            </div>
            <div className="text-[9px] font-bold uppercase tracking-wide opacity-50">High Freq.</div>
          </div>
        </div>

        {/* Day-of-week bar chart */}
        <div>
          <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-3"
             style={{ color: "#3D3D3D", opacity: 0.35 }}>
            Missing Students by Day (90 days)
          </p>
          <div className="flex items-end gap-1.5" style={{ height: 64 }}>
            {dayCount.map((count, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
                <div className="w-full rounded-t-md"
                     style={{
                       height:     Math.max(4, Math.round((count / maxDay) * 52)) + "px",
                       background: (i === 0 || i === 6) ? "#EAEAEA" : "#A6192E",
                       opacity:    count === 0 ? 0.2 : 1,
                     }} />
                <span className="text-[8px] font-bold"
                      style={{ color: "#999" }}>
                  {DAYS[i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Block bar chart */}
        {Object.keys(blockCount).length > 0 && (
          <div>
            <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-3"
               style={{ color: "#3D3D3D", opacity: 0.35 }}>
              Missing Students by Block (90 days)
            </p>
            <div className="flex items-end gap-2" style={{ height: 64 }}>
              {[1,2,3,4].map(b => {
                const count = blockCount[b] ?? 0
                return (
                  <div key={b} className="flex-1 flex flex-col items-center justify-end gap-1">
                    <span className="text-[9px] font-bold"
                          style={{ color: count === 0 ? "#BABABA" : "#3D3D3D" }}>
                      {count}
                    </span>
                    <div className="w-full rounded-t-md"
                         style={{
                           height:     Math.max(4, Math.round((count / maxBlock) * 44)) + "px",
                           background: "#A6192E",
                           opacity:    count === 0 ? 0.15 : 1,
                         }} />
                    <span className="text-[8px] font-bold" style={{ color: "#999" }}>Blk {b}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* High-frequency students */}
        <div>
          <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
             style={{ color: "#8B6200" }}>
            High Frequency — 3+ in 30 Days
          </p>

          {highFreq.length === 0 && (
            <p className="text-xs text-center py-4" style={{ color: "#999" }}>
              No students with 3+ incidents in the last 30 days.
            </p>
          )}

          <div className="flex flex-col gap-1.5">
            {highFreq.map(s => (
              <Link key={s.id} href={"/students/" + s.id} style={{ textDecoration: "none" }}>
                <div className="rounded-xl px-4 py-3 border flex items-center gap-3"
                     style={{ background: "#FFFDF0", borderColor: "#F0C040" }}>
                  <div className="flex-1">
                    <p className="text-sm font-bold" style={{ color: "#3D3D3D" }}>
                      {s.name}
                      <span className="ml-1.5 text-[10px] font-normal" style={{ color: "#999" }}>
                        Gr {s.grade}
                      </span>
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] font-bold"
                            style={{ color: "#8B6200" }}>
                        {s.last30} this month
                      </span>
                      <span className="text-[10px]" style={{ color: "#999" }}>
                        {s.total} total
                        {s.elevated > 0 ? " · " + s.elevated + " elevated" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-2xl font-black"
                         style={{ color: s.last30 >= 5 ? "#CE2033" : "#8B6200" }}>
                      {s.last30}
                    </div>
                    <span style={{ color: "#BABABA" }}>&rarr;</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <WelfareConcernLink />
      </main>
    </div>
  )
}
