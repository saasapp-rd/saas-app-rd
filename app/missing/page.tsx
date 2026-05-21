import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import BackLink from "@/components/BackLink"
import TestModeBanner from "@/components/TestModeBanner"
import Link from "next/link"
import LiveFeed from "@/components/LiveFeed"
import QuickActionsPanel from "@/components/admin/QuickActionsPanel"
import KnownNotInClassHeader from "@/components/KnownNotInClassHeader"

interface Incident {
  id:               string
  level:            string
  status:           string
  report_type:      string
  reported_at:      string
  block_id:         number | null
  located_location: string | null
  student:          { id: string; first_name: string; last_name: string; grade: number; is_active: boolean | null } | null
  reporter:         { display_name: string } | null
}

const REPORT_TYPE_LABEL: Record<string, string> = {
  absent_from_start:  "Absent from start",
  left_and_missing:   "Left class",
  welfare_concern:    "Welfare concern",
  coordinator_pull:   "Coordinator pull",
}

function elapsed(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return "Just now"
  if (m < 60) return m + " min"
  const h = Math.floor(m / 60)
  return h + "h " + (m % 60) + "m"
}

export default async function MissingPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const [{ data: incidents }, { data: allStudents }] = await Promise.all([
    db.from("incidents")
      .select("id, level, status, report_type, reported_at, block_id, located_location, student:student_id(id, first_name, last_name, grade, is_active), reporter:reported_by(display_name)")
      .in("status", ["open","located"])
      .neq("report_type", "welfare_concern")
      .order("level",       { ascending: false })  // elevated first
      .order("reported_at", { ascending: true  }),  // then oldest first
    // Staff use the welfare-concern modal on this page; fetch active
    // students for the picker. Other roles skip the lookup.
    session.user.role === "staff"
      ? db.from("users")
          .select("id, first_name, last_name, grade, call_by")
          .eq("role", "student")
          .eq("is_active", true)
          .order("last_name")
      : { data: [] as { id: string; first_name: string; last_name: string; grade: number; call_by: string | null }[] },
  ])

  const rows    = ((incidents ?? []) as unknown as Incident[]).filter(i => i.student?.is_active !== false)
  const open    = rows.filter(r => r.status === "open")
  const located = rows.filter(r => r.status === "located")
  const students = (allStudents ?? []) as {
    id: string; first_name: string; last_name: string; grade: number; call_by: string | null
  }[]

  const role    = session.user.role
  const isCoord = ["coordinator","counselor","dean","admin","super_admin"].includes(role)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between"
              style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">
            Live View
          </div>
          <div className="text-white text-[10px] opacity-70">
            {open.length} missing right now
            {located.length > 0 ? ` · ${located.length} located` : ""}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LiveFeed />
          <SignOutButton />
        </div>
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />

      {/* Nav — single Back link, consistent with every other page */}
      <nav className="px-5 py-2 border-b flex items-center" style={{ borderColor: "#EAEAEA" }}>
        <BackLink fallbackHref="/dashboard" />
      </nav>

      <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full flex flex-col gap-5">
        <KnownNotInClassHeader />

        {/* Hero count */}
        <div className="rounded-2xl p-5 text-center"
             style={{
               background: open.length > 0 ? "#FFF0F0" : "#F0FDF4",
               border: "1px solid " + (open.length > 0 ? "#FFCCCC" : "#22C55E"),
             }}>
          <div className="text-5xl font-black mb-1"
               style={{ color: open.length > 0 ? "#CE2033" : "#166534" }}>
            {open.length}
          </div>
          <div className="text-xs font-bold uppercase tracking-[0.2em]"
               style={{ color: open.length > 0 ? "#A6192E" : "#166534", opacity: 0.7 }}>
            {open.length === 1 ? "Student Missing" : "Students Missing"}
          </div>
          {located.length > 0 && (
            <div className="mt-2 text-[10px] font-bold" style={{ color: "#1E5FA6" }}>
              {located.length} located, waiting to close
            </div>
          )}
          {open.length === 0 && located.length === 0 && (
            <div className="mt-1 text-[10px]" style={{ color: "#166534", opacity: 0.7 }}>
              All students accounted for
            </div>
          )}
        </div>

        {/* Open incidents */}
        {open.length > 0 && (
          <div>
            <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
               style={{ color: "#3D3D3D", opacity: 0.35 }}>
              Missing Now — {open.length}
            </p>
            <div className="flex flex-col gap-1.5">
              {open.map(r => (
                <Link key={r.id}
                      href={isCoord ? "/coordinator/" + r.id : "#"}
                      style={{ textDecoration: "none", cursor: isCoord ? "pointer" : "default" }}>
                  <div className="rounded-xl px-4 py-3 border flex items-center gap-3"
                       style={{
                         background:   r.level === "elevated" ? "#FFF0F0" : "#FAFAFA",
                         borderColor:  r.level === "elevated" ? "#FFCCCC" : "#EAEAEA",
                         borderLeft:   "3px solid " + (r.level === "elevated" ? "#CE2033" : "#F0C040"),
                       }}>
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                         style={{
                           background: r.level === "elevated" ? "#FFE0E0" : "#EAEAEA",
                           color:      r.level === "elevated" ? "#A6192E" : "#888",
                         }}>
                      {r.student ? r.student.last_name[0] + r.student.first_name[0] : "?"}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-bold" style={{ color: "#3D3D3D" }}>
                          {r.student ? r.student.last_name + ", " + r.student.first_name : "Unknown"}
                        </span>
                        <span className="text-[10px]" style={{ color: "#999" }}>
                          Gr {r.student?.grade ?? "?"}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                        {r.level === "elevated" && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase"
                                style={{ background: "#FFE0E0", color: "#A6192E" }}>
                            Elevated
                          </span>
                        )}
                        <span className="text-[9px]" style={{ color: "#999" }}>
                          {elapsed(r.reported_at)}
                          {r.block_id ? " · Block " + r.block_id : ""}
                          {" · " + (REPORT_TYPE_LABEL[r.report_type] ?? r.report_type)}
                          {r.reporter ? " · " + r.reporter.display_name : ""}
                        </span>
                      </div>
                    </div>

                    {isCoord && <span style={{ color: "#BABABA" }}>&rarr;</span>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Located — awaiting close */}
        {located.length > 0 && (
          <div>
            <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
               style={{ color: "#1E5FA6" }}>
              Located — awaiting close
            </p>
            <div className="flex flex-col gap-1.5">
              {located.map(r => (
                <Link key={r.id}
                      href={isCoord ? "/coordinator/" + r.id : "#"}
                      style={{ textDecoration: "none", cursor: isCoord ? "pointer" : "default" }}>
                  <div className="rounded-xl px-4 py-3 border flex items-center gap-3"
                       style={{ background: "#EEF6FF", borderColor: "#93C5FD" }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                         style={{ background: "#DBEAFE", color: "#1E5FA6" }}>
                      {r.student ? r.student.last_name[0] + r.student.first_name[0] : "?"}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold" style={{ color: "#3D3D3D" }}>
                        {r.student ? r.student.last_name + ", " + r.student.first_name : "Unknown"}
                        <span className="ml-1.5 text-[10px] font-normal" style={{ color: "#999" }}>
                          Gr {r.student?.grade ?? "?"}
                        </span>
                      </p>
                      {r.located_location && (
                        <p className="text-[10px]" style={{ color: "#1D4ED8" }}>
                          {r.located_location}
                        </p>
                      )}
                    </div>
                    {isCoord && <span style={{ color: "#93C5FD" }}>&rarr;</span>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* All clear */}
        {open.length === 0 && located.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">&#x2713;</div>
            <p className="text-sm font-bold mb-1" style={{ color: "#166534" }}>All clear</p>
            <p className="text-xs" style={{ color: "#999" }}>
              No missing students right now.
            </p>
          </div>
        )}

        {/* Staff CTA — uses the same QuickActionsPanel modal flow as
            the /staff dashboard, so the welfare-concern UX is consistent
            across the two places staff might trigger it from. */}
        {["staff","nurse","accommodations"].includes(role) && students.length > 0 && (
          <QuickActionsPanel students={students} role={session.user.role} only={role === "staff" ? "welfare" : undefined} />
        )}
      </main>
    </div>
  )
}
