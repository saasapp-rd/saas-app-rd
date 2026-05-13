import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import Link from "next/link"
import FlagManager from "@/components/counselor/FlagManager"

const ALLOWED      = ["coordinator","counselor","dean","admin","super_admin","teacher","staff"]
const FLAG_ALLOWED = ["counselor","dean","admin","super_admin"]

const FLAG_STYLE: Record<string, { bg: string; color: string }> = {
  elevated:  { bg: "#FFF0F0", color: "#A6192E" },
  watch:     { bg: "#FFF8E0", color: "#8B6200" },
  emergency: { bg: "#FFE0E0", color: "#7B0000" },
}

const LEVEL_STYLE: Record<string, { bg: string; color: string }> = {
  routine:   { bg: "#EAEAEA",  color: "#3D3D3D" },
  elevated:  { bg: "#FFF0F0",  color: "#A6192E" },
  emergency: { bg: "#FFE0E0",  color: "#7B0000" },
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  open:     { bg: "#FFF8E0", color: "#8B6200", label: "Open"     },
  resolved: { bg: "#F0FDF4", color: "#166534", label: "Resolved" },
  located:  { bg: "#EEF6FF", color: "#1E5FA6", label: "Located"  },
}

interface IncidentRow {
  id:           string
  level:        string
  status:       string
  report_type:  string
  reported_at:  string
  resolved_at:  string | null
  block_id:     number | null
  located_location: string | null
  reporter:     { display_name: string } | null
}

interface FlagRow {
  id:          string
  flag_level:  string
  public_note: string | null
  flagged_at:  string
}

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!ALLOWED.includes(session.user.role)) redirect("/dashboard")

  const [stuResult, flagResult, incResult] = await Promise.all([
    db.from("students")
      .select("id, first_name, last_name, grade, student_id, parent_email, parent_name")
      .eq("id", id)
      .single(),
    db.from("student_concern_flags")
      .select("id, flag_level, public_note, flagged_at")
      .eq("student_id", id)
      .order("flagged_at", { ascending: false }),
    db.from("incidents")
      .select("id, level, status, report_type, reported_at, resolved_at, block_id, located_location, reporter:reported_by(display_name)")
      .eq("student_id", id)
      .order("reported_at", { ascending: false })
      .limit(50),
  ])

  if (stuResult.error || !stuResult.data) notFound()
  const stu       = stuResult.data
  const flags     = (flagResult.data ?? []) as FlagRow[]
  const incidents = (incResult.data ?? []) as unknown as IncidentRow[]

  const canManageFlags = FLAG_ALLOWED.includes(session.user.role)
  const now            = Date.now()
  const thirtyDays     = incidents.filter(i => (now - new Date(i.reported_at).getTime()) < 30 * 86400000)
  const elevCount      = incidents.filter(i => i.level === "elevated").length

  function duration(inc: IncidentRow): string {
    if (!inc.resolved_at) return "—"
    const ms = new Date(inc.resolved_at).getTime() - new Date(inc.reported_at).getTime()
    const m  = Math.round(ms / 60000)
    return m < 1 ? "<1m" : m + "m"
  }

  function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between"
              style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">Student Profile</div>
          <div className="text-white text-[10px] opacity-70">
            {stu.last_name}, {stu.first_name} &middot; Grade {stu.grade}
          </div>
        </div>
        <SignOutButton />
      </header>

      <nav className="px-5 py-2 border-b flex items-center gap-4" style={{ borderColor: "#EAEAEA" }}>
        <button onClick={() => history.back()}
                className="text-xs font-bold"
                style={{ color: "#A6192E", background: "none", border: "none", cursor: "pointer" }}>
          &larr; Back
        </button>
        <Link href="/missing" className="text-xs" style={{ color: "#999", textDecoration: "none" }}>
          Live View
        </Link>
      </nav>

      <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full flex flex-col gap-5">

        {/* Student info */}
        <div className="rounded-xl p-4 border" style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black"
                 style={{ background: "#EAEAEA", color: "#888" }}>
              {stu.last_name[0]}{stu.first_name[0]}
            </div>
            {flags.length > 0 && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase"
                    style={{
                      background: FLAG_STYLE[flags[0].flag_level]?.bg ?? "#EAEAEA",
                      color:      FLAG_STYLE[flags[0].flag_level]?.color ?? "#666",
                    }}>
                {flags[0].flag_level} concern
              </span>
            )}
          </div>
          <h1 className="text-lg font-black mb-0.5" style={{ color: "#3D3D3D" }}>
            {stu.last_name}, {stu.first_name}
          </h1>
          <div className="flex flex-wrap gap-3 text-[10px]" style={{ color: "#999" }}>
            <span>Grade {stu.grade}</span>
            {stu.student_id && <span>ID: {stu.student_id}</span>}
            {stu.parent_email && <span>{stu.parent_email}</span>}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl p-3 text-center" style={{ background: "#F7F7F7" }}>
            <div className="text-2xl font-black" style={{ color: "#A6192E" }}>{incidents.length}</div>
            <div className="text-[9px] font-bold uppercase tracking-wide opacity-50">Total</div>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: "#F7F7F7" }}>
            <div className="text-2xl font-black" style={{ color: "#A6192E" }}>{thirtyDays.length}</div>
            <div className="text-[9px] font-bold uppercase tracking-wide opacity-50">Last 30d</div>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: "#F7F7F7" }}>
            <div className="text-2xl font-black"
                 style={{ color: elevCount > 0 ? "#CE2033" : "#A6192E" }}>
              {elevCount}
            </div>
            <div className="text-[9px] font-bold uppercase tracking-wide opacity-50">Elevated</div>
          </div>
        </div>

        {/* Concern flags — view + manage */}
        <div>
          <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
             style={{ color: "#3D3D3D", opacity: 0.35 }}>
            Concern Flags {flags.length > 0 ? "— " + flags.length : ""}
          </p>

          {canManageFlags ? (
            <FlagManager studentId={stu.id} initialFlags={flags} />
          ) : (
            flags.length === 0 ? (
              <p className="text-xs py-3 text-center" style={{ color: "#999" }}>No flags on record.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {flags.map(f => (
                  <div key={f.id} className="rounded-xl px-4 py-2.5 border flex items-start justify-between"
                       style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
                    <div>
                      {f.public_note && (
                        <p className="text-xs" style={{ color: "#3D3D3D" }}>{f.public_note}</p>
                      )}
                      <p className="text-[10px]" style={{ color: "#999" }}>{fmtDate(f.flagged_at)}</p>
                    </div>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase"
                          style={{
                            background: FLAG_STYLE[f.flag_level]?.bg ?? "#EAEAEA",
                            color:      FLAG_STYLE[f.flag_level]?.color ?? "#666",
                          }}>
                      {f.flag_level}
                    </span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        {/* Incident history */}
        <div>
          <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
             style={{ color: "#3D3D3D", opacity: 0.35 }}>
            History &mdash; {incidents.length}
          </p>

          {incidents.length === 0 && (
            <p className="text-xs text-center py-6" style={{ color: "#999" }}>No history on record.</p>
          )}

          <div className="flex flex-col gap-1.5">
            {incidents.map(inc => {
              const lvl = LEVEL_STYLE[inc.level]  ?? LEVEL_STYLE["routine"]
              const sta = STATUS_STYLE[inc.status] ?? STATUS_STYLE["open"]
              return (
                <Link key={inc.id} href={"/coordinator/" + inc.id}
                      style={{ textDecoration: "none" }}>
                  <div className="rounded-xl px-4 py-3 border flex items-center gap-3"
                       style={{
                         background:  inc.level === "elevated" ? "#FFF8F8" : "#FAFAFA",
                         borderColor: inc.level === "elevated" ? "#FFCCCC" : "#EAEAEA",
                         borderLeft:  "3px solid " + (inc.level === "elevated" ? "#CE2033" : "#F0C040"),
                       }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                              style={{ background: lvl.bg, color: lvl.color }}>{inc.level}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                              style={{ background: sta.bg, color: sta.color }}>{sta.label}</span>
                      </div>
                      <p className="text-[10px]" style={{ color: "#999" }}>
                        {fmtDate(inc.reported_at)}
                        {inc.block_id ? " · Block " + inc.block_id : ""}
                        {inc.reporter ? " · " + inc.reporter.display_name : ""}
                        {inc.located_location ? " · " + inc.located_location : ""}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[10px] font-bold" style={{ color: "#999" }}>{duration(inc)}</p>
                      <p className="text-[9px]" style={{ color: "#BABABA" }}>&rarr;</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
