import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import DateSelector from "@/components/admin/DateSelector"
import Link from "next/link"

export const dynamic = "force-dynamic"

const ALLOWED = ["admin", "super_admin", "dean", "coordinator", "counselor"]

const LEVEL_STYLE: Record<string, { bg: string; color: string }> = {
  routine:   { bg: "#EAEAEA",  color: "#3D3D3D" },
  elevated:  { bg: "#FFF0F0",  color: "#A6192E" },
  emergency: { bg: "#FFE0E0",  color: "#7B0000" },
}
const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  open:     { bg: "#FFF8E0", color: "#8B6200", label: "Open"     },
  located:  { bg: "#EEF6FF", color: "#1E5FA6", label: "Located"  },
  resolved: { bg: "#F0FDF4", color: "#166534", label: "Resolved" },
}
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

interface IncidentRow {
  id:               string
  level:            string
  status:           string
  report_type:      string
  reported_at:      string
  resolved_at:      string | null
  located_location: string | null
  located_excused:  boolean | null
  block_id:         number | null
  student:          { id: string; first_name: string; last_name: string; grade: number } | null
  reporter:         { display_name: string } | null
}

interface StudentStat {
  id:       string
  name:     string
  grade:    number
  total:    number
  last30:   number
  elevated: number
}

function ymd(d: Date): string {
  // Local-time YYYY-MM-DD; toISOString() would return UTC and skew across
  // the int'l date line at midnight Pacific.
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

/**
 * Shared body for an incident row in the Today list. Extracted so the
 * student-link and unknown-student variants both render the same
 * content without duplicating the JSX.
 */
function RowBody({ r, lvl, sta }: {
  r:   IncidentRow
  lvl: { bg: string; color: string }
  sta: { bg: string; color: string; label: string }
}) {
  return (
    <>
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className="text-sm font-bold" style={{ color: r.student ? "#A6192E" : "#3D3D3D" }}>
          {r.student ? r.student.last_name + ", " + r.student.first_name : "Unknown"}
        </span>
        <span className="text-[10px]" style={{ color: "#999" }}>Gr {r.student?.grade ?? "?"}</span>
        {r.student && (
          <span className="text-[9px] font-bold" style={{ color: "#A6192E" }}>↗</span>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
              style={{ background: lvl.bg, color: lvl.color }}>{r.level}</span>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
              style={{ background: sta.bg, color: sta.color }}>{sta.label}</span>
        <span className="text-[9px]" style={{ color: "#999" }}>
          {fmtTime(r.reported_at)}
          {r.block_id ? " · Blk " + r.block_id : ""}
          {r.reporter ? " · " + r.reporter.display_name : ""}
        </span>
      </div>
    </>
  )
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; date?: string }>
}) {
  const { tab = "today", date: dateParam } = await searchParams

  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!ALLOWED.includes(session.user.role)) redirect("/dashboard")

  const isCounselor = session.user.role === "counselor"

  // Counselor: scope to their flagged students
  let scopedStudentIds: string[] | null = null
  if (isCounselor) {
    const { data: flags } = await db
      .from("student_concern_flags")
      .select("student_id")
    scopedStudentIds = (flags ?? []).map((f: { student_id: string }) => f.student_id)
  }

  const today        = ymd(new Date())
  // Selected date for the Today tab — defaults to today, accepts any
  // YYYY-MM-DD via ?date= query param. Anything malformed falls back
  // to today.
  const selectedDate = (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) ? dateParam : today
  const isToday      = selectedDate === today

  const selectedLabel = new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  })
  const todayStr      = selectedLabel  // legacy var kept to minimize diff

  const now    = Date.now()
  const days90 = new Date(now - 90 * 86400000).toISOString()
  const days30 = new Date(now - 30 * 86400000).toISOString()

  // ── Today tab data ─────────────────────────────────────────────────────────
  let todayRows: IncidentRow[] = []
  if (tab === "today") {
    let q = db
      .from("incidents")
      .select("id, level, status, report_type, reported_at, resolved_at, located_location, located_excused, block_id, student:student_id(id, first_name, last_name, grade), reporter:reported_by(display_name)")
      .gte("reported_at", selectedDate + "T00:00:00+00:00")
      .lte("reported_at", selectedDate + "T23:59:59+00:00")
      .order("reported_at", { ascending: false })

    if (scopedStudentIds !== null) {
      if (scopedStudentIds.length === 0) {
        todayRows = []
      } else {
        const { data } = await q.in("student_id", scopedStudentIds)
        todayRows = (data ?? []) as unknown as IncidentRow[]
      }
    } else {
      const { data } = await q
      todayRows = (data ?? []) as unknown as IncidentRow[]
    }
  }

  // ── Patterns tab data ───────────────────────────────────────────────────────
  let patternRows: IncidentRow[] = []
  if (tab === "patterns") {
    let q = db
      .from("incidents")
      .select("id, level, status, reported_at, block_id, student:student_id(id, first_name, last_name, grade)")
      .gte("reported_at", days90)
      .order("reported_at", { ascending: false })

    if (scopedStudentIds !== null) {
      if (scopedStudentIds.length === 0) {
        patternRows = []
      } else {
        const { data } = await q.in("student_id", scopedStudentIds)
        patternRows = (data ?? []) as unknown as IncidentRow[]
      }
    } else {
      const { data } = await q
      patternRows = (data ?? []) as unknown as IncidentRow[]
    }
  }

  // ── Today stats ─────────────────────────────────────────────────────────────
  const openCount     = todayRows.filter(r => r.status === "open").length
  const elevCount     = todayRows.filter(r => r.level === "elevated").length
  const resolvedCount = todayRows.filter(r => r.status === "resolved").length

  // ── Pattern stats ───────────────────────────────────────────────────────────
  const byStudent: Record<string, StudentStat> = {}
  for (const r of patternRows) {
    const s = r.student
    if (!s) continue
    if (!byStudent[s.id]) {
      byStudent[s.id] = { id: s.id, name: s.last_name + ", " + s.first_name, grade: s.grade, total: 0, last30: 0, elevated: 0 }
    }
    byStudent[s.id].total++
    if (r.reported_at >= days30)     byStudent[s.id].last30++
    if (r.level === "elevated")      byStudent[s.id].elevated++
  }
  const highFreq = Object.values(byStudent)
    .filter(s => s.last30 >= 3)
    .sort((a, b) => b.last30 - a.last30)
    .slice(0, 10)

  const dayCount: number[]              = Array(7).fill(0)
  const blockCount: Record<number, number> = {}
  for (const r of patternRows) {
    dayCount[new Date(r.reported_at).getDay()]++
    if (r.block_id) blockCount[r.block_id] = (blockCount[r.block_id] ?? 0) + 1
  }
  const maxDay   = Math.max(...dayCount, 1)
  const maxBlock = Math.max(...Object.values(blockCount), 1)

  function duration(r: IncidentRow): string {
    if (!r.resolved_at) return "open"
    const m = Math.round((new Date(r.resolved_at).getTime() - new Date(r.reported_at).getTime()) / 60000)
    return m < 1 ? "<1m" : m + "m"
  }

  const subtitle = isCounselor
    ? `Your caseload · ${scopedStudentIds?.length ?? 0} flagged students`
    : "School-wide attendance data"

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between"
              style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">Analytics</div>
          <div className="text-white text-[10px] opacity-70">{subtitle}</div>
        </div>
        <SignOutButton />
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />
      <nav className="px-5 py-2 border-b flex items-center gap-4" style={{ borderColor: "#EAEAEA" }}>
        <Link href="/dashboard" className="text-xs font-bold"
              style={{ color: "#A6192E", textDecoration: "none" }}>
          &larr; Dashboard
        </Link>
        <Link href="/missing" className="text-xs"
              style={{ color: "#999", textDecoration: "none" }}>
          Live View
        </Link>
        {/* Print / Export hidden — pending a rebuild of the printable view. */}
      </nav>

      {/* Tabs */}
      <div className="px-5 pt-4 flex gap-1 max-w-2xl mx-auto w-full">
        {(["today", "patterns"] as const).map(t => {
          // Keep the selected date when navigating to/from the Today tab
          // so prev/next browsing survives a tab toggle.
          const href = t === "today" && !isToday
            ? `/analytics?tab=${t}&date=${selectedDate}`
            : `/analytics?tab=${t}`
          return (
            <Link key={t} href={href}
                  className="px-4 py-2 rounded-xl text-xs font-bold capitalize"
                  style={{
                    background:  tab === t ? "#A6192E" : "#F0F0F0",
                    color:       tab === t ? "#fff"     : "#999",
                    textDecoration: "none",
                  }}>
              {t === "today" ? (isToday ? `Today — ${selectedLabel}` : selectedLabel) : "Patterns (90 days)"}
            </Link>
          )
        })}
      </div>

      <main className="flex-1 px-5 py-5 max-w-2xl mx-auto w-full flex flex-col gap-5">

        {/* ── TODAY TAB ─────────────────────────────────────────────── */}
        {tab === "today" && (
          <>
            <DateSelector selectedDate={selectedDate} todayIso={today} />

            {isCounselor && scopedStudentIds?.length === 0 && (
              <div className="rounded-xl px-4 py-6 text-center border" style={{ borderColor: "#EAEAEA" }}>
                <p className="text-sm font-bold mb-1" style={{ color: "#3D3D3D" }}>No flagged students</p>
                <p className="text-xs" style={{ color: "#999" }}>
                  Flag students from their profile to track them here.
                </p>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Total",    val: todayRows.length, color: "#3D3D3D" },
                { label: "Open",     val: openCount,        color: openCount    > 0 ? "#CE2033" : "#3D3D3D" },
                { label: "Elevated", val: elevCount,        color: elevCount    > 0 ? "#CE2033" : "#3D3D3D" },
                { label: "Resolved", val: resolvedCount,    color: "#166534" },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "#F7F7F7" }}>
                  <div className="text-2xl font-black" style={{ color: s.color }}>{s.val}</div>
                  <div className="text-[9px] font-bold uppercase tracking-wide opacity-50">{s.label}</div>
                </div>
              ))}
            </div>

            {todayRows.length === 0 && (scopedStudentIds === null || scopedStudentIds.length > 0) && (
              <div className="rounded-xl px-4 py-8 text-center border" style={{ borderColor: "#EAEAEA" }}>
                <p className="text-sm font-bold mb-1" style={{ color: "#3D3D3D" }}>
                  {isToday ? "No missing students today" : `No missing students on ${selectedLabel}`}
                </p>
                <p className="text-xs" style={{ color: "#999" }}>All students accounted for.</p>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              {todayRows.map(r => {
                const lvl = LEVEL_STYLE[r.level]  ?? LEVEL_STYLE["routine"]
                const sta = STATUS_STYLE[r.status] ?? STATUS_STYLE["open"]
                const studentId = r.student?.id ?? null
                return (
                  <div key={r.id}
                       className="rounded-xl border flex items-stretch overflow-hidden"
                       style={{
                         background:  r.level === "elevated" ? "#FFF8F8" : "#FAFAFA",
                         borderColor: r.level === "elevated" ? "#FFCCCC" : "#EAEAEA",
                         borderLeft:  "3px solid " + (r.level === "elevated" ? "#CE2033" : "#EAEAEA"),
                       }}>
                    {/* Left tap target — student name / pills / time
                        links to that student's missing-data drill-down.
                        Bigger affordance because patterns analysis is the
                        primary "why did I click here" intent. */}
                    {studentId ? (
                      <Link href={`/students/${studentId}/incidents`}
                            className="flex-1 min-w-0 px-4 py-3"
                            style={{ textDecoration: "none" }}>
                        <RowBody r={r} lvl={lvl} sta={sta} />
                      </Link>
                    ) : (
                      <div className="flex-1 min-w-0 px-4 py-3">
                        <RowBody r={r} lvl={lvl} sta={sta} />
                      </div>
                    )}

                    {/* Right tap target — duration + explicit "View report"
                        link to the incident workflow page. */}
                    <Link href={`/coordinator/${r.id}`}
                          className="flex-shrink-0 flex flex-col items-end justify-center px-4 py-3 border-l"
                          style={{
                            borderColor: r.level === "elevated" ? "#FFCCCC" : "#EAEAEA",
                            textDecoration: "none",
                            background: "#fff",
                            minWidth: 92,
                          }}>
                      <span className="text-[10px] font-bold"
                            style={{ color: r.status === "open" ? "#CE2033" : "#999" }}>
                        {duration(r)}
                      </span>
                      <span className="text-[9px] font-bold mt-0.5"
                            style={{ color: "#1E5FA6" }}>
                        View report →
                      </span>
                    </Link>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* ── PATTERNS TAB ──────────────────────────────────────────── */}
        {tab === "patterns" && (
          <>
            {isCounselor && scopedStudentIds?.length === 0 && (
              <div className="rounded-xl px-4 py-6 text-center border" style={{ borderColor: "#EAEAEA" }}>
                <p className="text-sm font-bold mb-1" style={{ color: "#3D3D3D" }}>No flagged students</p>
                <p className="text-xs" style={{ color: "#999" }}>
                  Flag students from their profile to track them here.
                </p>
              </div>
            )}

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl p-3 text-center" style={{ background: "#F7F7F7" }}>
                <div className="text-2xl font-black" style={{ color: "#3D3D3D" }}>{patternRows.length}</div>
                <div className="text-[9px] font-bold uppercase tracking-wide opacity-50">90-Day Total</div>
              </div>
              <div className="rounded-xl p-3 text-center" style={{ background: "#F7F7F7" }}>
                <div className="text-2xl font-black"
                     style={{ color: patternRows.filter(r => r.level === "elevated").length > 0 ? "#CE2033" : "#3D3D3D" }}>
                  {patternRows.filter(r => r.level === "elevated").length}
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

            {/* Day-of-week chart */}
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
                    <span className="text-[8px] font-bold" style={{ color: "#999" }}>{DAYS[i]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Block chart */}
            {Object.keys(blockCount).length > 0 && (
              <div>
                <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-3"
                   style={{ color: "#3D3D3D", opacity: 0.35 }}>
                  Missing Students by Block (90 days)
                </p>
                <div className="flex items-end gap-2" style={{ height: 64 }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(b => {
                    const count = blockCount[b] ?? 0
                    return (
                      <div key={b} className="flex-1 flex flex-col items-center justify-end gap-1">
                        <span className="text-[9px] font-bold"
                              style={{ color: count === 0 ? "#BABABA" : "#3D3D3D" }}>
                          {count || ""}
                        </span>
                        <div className="w-full rounded-t-md"
                             style={{
                               height:     Math.max(4, Math.round((count / maxBlock) * 44)) + "px",
                               background: "#A6192E",
                               opacity:    count === 0 ? 0.1 : 1,
                             }} />
                        <span className="text-[8px] font-bold" style={{ color: "#999" }}>{b}</span>
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
              {highFreq.length === 0 ? (
                <p className="text-xs text-center py-4" style={{ color: "#999" }}>
                  No students with 3+ absences in the last 30 days.
                </p>
              ) : (
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
                            <span className="text-[10px] font-bold" style={{ color: "#8B6200" }}>
                              {s.last30} this month
                            </span>
                            <span className="text-[10px]" style={{ color: "#999" }}>
                              {s.total} total{s.elevated > 0 ? ` · ${s.elevated} elevated` : ""}
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
              )}
            </div>
          </>
        )}

      </main>
    </div>
  )
}
