import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import LiveFeed from "@/components/LiveFeed"
import WelfareConcernLink from "@/components/WelfareConcernLink"
import QuickActionsPanel from "@/components/admin/QuickActionsPanel"
import Link from "next/link"

const FLAG_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  elevated:  { bg: "#FFF0F0", color: "#A6192E", label: "Elevated" },
  watch:     { bg: "#FFF8E0", color: "#8B6200", label: "Watch"    },
  emergency: { bg: "#FFE0E0", color: "#7B0000", label: "Emergency"},
}

interface FlagRow {
  id:          string
  flag_level:  string
  public_note: string | null
  flagged_at:  string
  student:     { id: string; first_name: string; last_name: string; grade: number; is_active: boolean | null } | null
}

interface OpenIncident {
  id:         string
  student_id: string
  level:      string
  block_id:   number | null
  reported_at: string
}

export default async function CounselorPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!["counselor", "admin", "super_admin"].includes(session.user.role)) redirect("/dashboard")

  // Flagged students + active students (for the Quick Actions modal pickers)
  const [{ data: flagRows }, { data: allStudents }] = await Promise.all([
    db.from("student_concern_flags")
      .select("id, flag_level, public_note, flagged_at, student:student_id(id, first_name, last_name, grade, is_active)")
      .order("flag_level", { ascending: false })
      .order("flagged_at", { ascending: false }),
    db.from("users")
      .select("id, first_name, last_name, grade, call_by")
      .eq("role", "student")
      .eq("is_active", true)
      .order("last_name"),
  ])

  const students = (allStudents ?? []) as {
    id: string; first_name: string; last_name: string; grade: number; call_by: string | null
  }[]

  const flags         = ((flagRows ?? []) as unknown as FlagRow[])
    .filter(f => f.student?.is_active !== false)
  const flaggedIds    = flags.map(f => f.student?.id).filter(Boolean) as string[]

  // Open incidents right now (for "active" badge)
  const openMap: Record<string, OpenIncident> = {}
  if (flaggedIds.length > 0) {
    const { data: open } = await db
      .from("incidents")
      .select("id, student_id, level, block_id, reported_at")
      .in("student_id", flaggedIds)
      .eq("status", "open")
    ;(open ?? []).forEach((i: OpenIncident) => { openMap[i.student_id] = i })
  }

  // 30-day incident counts
  const countMap: Record<string, number> = {}
  if (flaggedIds.length > 0) {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recent } = await db
      .from("incidents")
      .select("student_id")
      .in("student_id", flaggedIds)
      .gte("reported_at", since)
    ;(recent ?? []).forEach((i: { student_id: string }) => {
      countMap[i.student_id] = (countMap[i.student_id] ?? 0) + 1
    })
  }

  // All open incidents (for All Incidents tab)
  const { data: allOpenRaw } = await db
    .from("incidents")
    .select("id, level, reported_at, block_id, student:student_id(first_name, last_name, grade, is_active), reporter:reported_by(display_name)")
    .eq("status", "open")
    .order("level",       { ascending: false })
    .order("reported_at", { ascending: true  })

  const allOpen = ((allOpenRaw ?? []) as any[])
    .filter(r => {
      const s = Array.isArray(r.student) ? r.student[0] : r.student
      return s?.is_active !== false
    })

  const activeCount = Object.keys(openMap).length

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between" style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase flex items-center gap-2">
            Counselor
            <LiveFeed />
          </div>
          <div className="text-white text-[10px] opacity-70">
            {flags.length} flagged · {activeCount} active now
          </div>
        </div>
        <SignOutButton />
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />

      <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full flex flex-col gap-5">

        {/* Quick actions */}
        {students.length > 0 && <QuickActionsPanel students={students} />}

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl p-3" style={{ background: "#F7F7F7" }}>
            <div className="text-2xl font-black" style={{ color: "#A6192E" }}>{flags.length}</div>
            <div className="text-[9px] font-bold uppercase tracking-wide opacity-50">Flagged</div>
          </div>
          <div className="rounded-xl p-3" style={{ background: "#F7F7F7" }}>
            <div className="text-2xl font-black" style={{ color: "#A6192E" }}>{activeCount}</div>
            <div className="text-[9px] font-bold uppercase tracking-wide opacity-50">Active now</div>
          </div>
          <div className="rounded-xl p-3" style={{ background: "#F7F7F7" }}>
            <div className="text-2xl font-black" style={{ color: "#A6192E" }}>{(allOpen ?? []).length}</div>
            <div className="text-[9px] font-bold uppercase tracking-wide opacity-50">Open total</div>
          </div>
        </div>

        {/* Flagged students */}
        {flags.length > 0 && (
          <div>
            <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
               style={{ color: "#3D3D3D", opacity: 0.35 }}>
              Flagged Students &mdash; {flags.length}
            </p>
            <div className="flex flex-col divide-y" style={{ borderColor: "#EAEAEA" }}>
              {flags.map(f => {
                const s        = f.student
                if (!s) return null
                const style    = FLAG_STYLE[f.flag_level] ?? FLAG_STYLE["watch"]
                const isActive = !!openMap[s.id]
                const count    = countMap[s.id] ?? 0
                const open     = openMap[s.id]

                return (
                  <div key={f.id} className="flex items-start gap-3 py-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                         style={{ background: "#EAEAEA", color: "#888" }}>
                      {s.last_name[0]}{s.first_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold" style={{ color: "#3D3D3D" }}>
                        {s.last_name}, {s.first_name}
                      </div>
                      <div className="text-[10px]" style={{ color: "#999" }}>
                        Grade {s.grade}
                        {count > 0 ? " · " + count + " missing (30d)" : ""}
                        {open ? " · Block " + open.block_id : ""}
                      </div>
                      {f.public_note && (
                        <div className="text-[10px] mt-0.5 italic" style={{ color: "#888" }}>
                          {f.public_note}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase"
                            style={{ background: style.bg, color: style.color }}>
                        {style.label}
                      </span>
                      {isActive && (
                        <span className="text-[9px] font-bold" style={{ color: "#CE2033" }}>
                          &#9679; Missing now
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {flags.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center py-12 gap-2">
            <div className="text-3xl">&#x1F4CB;</div>
            <p className="text-sm font-bold" style={{ color: "#3D3D3D" }}>No flagged students</p>
            <p className="text-xs" style={{ color: "#999" }}>
              Flag students in their incident record to track them here.
            </p>
          </div>
        )}

        {/* All open incidents */}
        {(allOpen ?? []).length > 0 && (
          <div>
            <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
               style={{ color: "#3D3D3D", opacity: 0.35 }}>
              All Missing Now &mdash; {(allOpen ?? []).length}
            </p>
            <div className="flex flex-col gap-1.5">
              {(allOpen ?? []).map((inc: any) => {
                const s      = inc.student as { first_name: string; last_name: string; grade: number } | null
                const isElev = inc.level === "elevated"
                const mins   = Math.floor((Date.now() - new Date(inc.reported_at).getTime()) / 60000)
                return (
                  <Link key={inc.id} href={"/coordinator/" + inc.id} style={{ textDecoration: "none" }}>
                    <div className="rounded-xl px-4 py-2.5 border flex items-center justify-between"
                         style={{
                           background:  isElev ? "#FFF8F8" : "#FAFAFA",
                           borderColor: isElev ? "#CE2033"  : "#EAEAEA",
                           borderLeft:  "3px solid " + (isElev ? "#CE2033" : "#F0C040"),
                         }}>
                      <span className="text-sm font-semibold" style={{ color: "#3D3D3D" }}>
                        {s ? s.last_name + ", " + s.first_name : "Unknown"}
                      </span>
                      <span className="text-[10px]" style={{ color: "#999" }}>
                        {inc.block_id ? "Blk " + inc.block_id + " · " : ""}
                        {mins < 1 ? "just now" : mins + "m"}
                      </span>
                    </div>
                  </Link>
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
