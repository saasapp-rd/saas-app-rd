import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import BackLink from "@/components/BackLink"
import TestModeBanner from "@/components/TestModeBanner"
import Link from "next/link"

const ALLOWED = ["admin","super_admin","dean","coordinator"]

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
  student:          { first_name: string; last_name: string; grade: number } | null
  reporter:         { display_name: string } | null
}

export default async function AdminDailyPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!ALLOWED.includes(session.user.role)) redirect("/dashboard")

  const today    = new Date().toISOString().split("T")[0]
  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  })

  const { data: incidents } = await db
    .from("incidents")
    .select("id, level, status, report_type, reported_at, resolved_at, located_location, located_excused, block_id, student:student_id(first_name, last_name, grade), reporter:reported_by(display_name)")
    .gte("reported_at", today + "T00:00:00+00:00")
    .lte("reported_at", today + "T23:59:59+00:00")
    .order("reported_at", { ascending: false })

  const allRows = (incidents ?? []) as unknown as IncidentRow[]
  // Split the day's reports: missing-student vs welfare-concern.
  // Welfare concerns belong to a separate workflow (flag the
  // counselor + dean) and shouldn't be counted in the missing-
  // student totals on this page.
  const rows          = allRows.filter(r => r.report_type !== "welfare_concern")
  const welfareRows   = allRows.filter(r => r.report_type === "welfare_concern")
  const openCount     = rows.filter(r => r.status === "open").length
  const elevCount     = rows.filter(r => r.level  === "elevated").length
  const resolvedCount = rows.filter(r => r.status === "resolved").length

  function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit",
    })
  }

  function duration(r: IncidentRow): string {
    if (!r.resolved_at) return "open"
    const ms = new Date(r.resolved_at).getTime() - new Date(r.reported_at).getTime()
    const m  = Math.round(ms / 60000)
    return m < 1 ? "<1m" : m + "m"
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between"
              style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">Daily Summary</div>
          <div className="text-white text-[10px] opacity-70">{todayStr}</div>
        </div>
        <SignOutButton />
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />
      <nav className="px-5 py-2 border-b flex items-center gap-4" style={{ borderColor: "#EAEAEA" }}>
        <BackLink fallbackHref="/dashboard" />
        <Link href="/missing" className="text-xs"
              style={{ color: "#999", textDecoration: "none" }}>
          Live View
        </Link>
        <Link href="/admin/daily/print" target="_blank"
              className="ml-auto text-xs font-bold"
              style={{ color: "#1E5FA6", textDecoration: "none" }}>
          Print / Export &#x2197;
        </Link>
      </nav>

      <main className="flex-1 px-5 py-5 max-w-2xl mx-auto w-full flex flex-col gap-5">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Total",    val: rows.length,    color: "#3D3D3D" },
            { label: "Open",     val: openCount,      color: openCount    > 0 ? "#CE2033" : "#3D3D3D" },
            { label: "Elevated", val: elevCount,      color: elevCount    > 0 ? "#CE2033" : "#3D3D3D" },
            { label: "Resolved", val: resolvedCount,  color: "#166534" },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: "#F7F7F7" }}>
              <div className="text-2xl font-black" style={{ color: s.color }}>{s.val}</div>
              <div className="text-[9px] font-bold uppercase tracking-wide opacity-50">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Incident list */}
        <div>
          <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
             style={{ color: "#3D3D3D", opacity: 0.35 }}>
            All Missing Students Today
          </p>

          {rows.length === 0 && (
            <div className="rounded-xl px-4 py-8 text-center border" style={{ borderColor: "#EAEAEA" }}>
              <p className="text-sm font-bold mb-1" style={{ color: "#3D3D3D" }}>No missing students today</p>
              <p className="text-xs" style={{ color: "#999" }}>All students accounted for.</p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            {rows.map(r => {
              const lvl = LEVEL_STYLE[r.level]  ?? LEVEL_STYLE["routine"]
              const sta = STATUS_STYLE[r.status] ?? STATUS_STYLE["open"]
              return (
                <Link key={r.id} href={"/coordinator/" + r.id} style={{ textDecoration: "none" }}>
                  <div className="rounded-xl px-4 py-3 border flex items-center gap-3"
                       style={{
                         background:  r.level === "elevated" ? "#FFF8F8" : "#FAFAFA",
                         borderColor: r.level === "elevated" ? "#FFCCCC" : "#EAEAEA",
                         borderLeft:  "3px solid " + (r.level === "elevated" ? "#CE2033" : "#EAEAEA"),
                       }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm font-bold" style={{ color: "#3D3D3D" }}>
                          {r.student ? r.student.last_name + ", " + r.student.first_name : "Unknown"}
                        </span>
                        <span className="text-[10px]" style={{ color: "#999" }}>
                          Gr {r.student?.grade ?? "?"}
                        </span>
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
                      {r.located_location && (
                        <p className="text-[9px] mt-0.5" style={{ color: "#16A34A" }}>
                          Found: {r.located_location}{r.located_excused ? " (excused)" : ""}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[10px] font-bold"
                         style={{ color: r.status === "open" ? "#CE2033" : "#999" }}>
                        {duration(r)}
                      </p>
                      <p className="text-[9px]" style={{ color: "#BABABA" }}>&rarr;</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Welfare concerns — separate workflow (counselor / dean follow-up),
            kept distinct from the missing-student list. */}
        {welfareRows.length > 0 && (
          <div>
            <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
               style={{ color: "#8B6200", opacity: 0.6 }}>
              Welfare Concerns Today — {welfareRows.length}
            </p>
            <div className="flex flex-col gap-1.5">
              {welfareRows.map(r => (
                <Link key={r.id} href={"/coordinator/" + r.id} style={{ textDecoration: "none" }}>
                  <div className="rounded-xl px-4 py-3 border flex items-center gap-3"
                       style={{
                         background:  "#FFFBEB",
                         borderColor: "#FDE68A",
                         borderLeft:  "3px solid #F0C040",
                       }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm font-bold" style={{ color: "#3D3D3D" }}>
                          {r.student ? r.student.last_name + ", " + r.student.first_name : "Unknown"}
                        </span>
                        <span className="text-[10px]" style={{ color: "#999" }}>
                          Gr {r.student?.grade ?? "?"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                              style={{ background: "#FEF3C7", color: "#8B6200" }}>
                          Welfare Concern
                        </span>
                        <span className="text-[9px]" style={{ color: "#999" }}>
                          {fmtTime(r.reported_at)}
                          {r.reporter ? " · " + r.reporter.display_name : ""}
                        </span>
                      </div>
                    </div>
                    <p className="text-[9px] flex-shrink-0" style={{ color: "#BABABA" }}>&rarr;</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
