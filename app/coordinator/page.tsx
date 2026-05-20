import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import Link from "next/link"
import LiveFeed from "@/components/LiveFeed"
import PullButton from "@/components/coordinator/PullButton"

const ALLOWED = ["coordinator","counselor","dean","admin","super_admin"]

interface Incident {
  id:          string
  level:       string
  status:      string
  reported_at: string
  block_id:    number | null
  student:     { id: string; first_name: string; last_name: string; grade: number } | null
  reporter:    { display_name: string } | null
}

export default async function CoordinatorPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!ALLOWED.includes(session.user.role)) redirect("/dashboard")

  const { data: incidents } = await db
    .from("incidents")
    .select("id, level, status, reported_at, block_id, student:student_id(id, first_name, last_name, grade), reporter:reported_by(display_name)")
    .in("status", ["open","located"])
    .neq("report_type", "welfare_concern")
    .order("reported_at", { ascending: true })

  const rows    = (incidents ?? []) as unknown as Incident[]
  const elev    = rows.filter(r => r.level === "elevated")
  const routine = rows.filter(r => r.level !== "elevated")

  function minsAgo(iso: string) {
    const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    return m < 1 ? "just now" : m + "m ago"
  }

  const isCoord = session.user.role !== "counselor"

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between"
              style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">Coordinator</div>
          <div className="text-white text-[10px] opacity-70">{session.user.displayName}</div>
        </div>
        <div className="flex items-center gap-3">
          <LiveFeed />
          <SignOutButton />
        </div>
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />
      <nav className="px-5 py-2 border-b flex items-center gap-4" style={{ borderColor: "#EAEAEA" }}>
        <Link href="/missing" className="text-xs font-bold"
              style={{ color: "#A6192E", textDecoration: "none" }}>
          &larr; Missing
        </Link>
        <Link href="/dean" className="text-xs"
              style={{ color: "#999", textDecoration: "none" }}>
          Patterns
        </Link>
      </nav>

      <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full flex flex-col gap-5">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl p-3 text-center" style={{ background: "#F7F7F7" }}>
            <div className="text-2xl font-black"
                 style={{ color: rows.length > 0 ? "#CE2033" : "#3D3D3D" }}>
              {rows.length}
            </div>
            <div className="text-[9px] font-bold uppercase tracking-wide opacity-50">Active</div>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: "#F7F7F7" }}>
            <div className="text-2xl font-black"
                 style={{ color: elev.length > 0 ? "#CE2033" : "#3D3D3D" }}>
              {elev.length}
            </div>
            <div className="text-[9px] font-bold uppercase tracking-wide opacity-50">Elevated</div>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: "#F7F7F7" }}>
            <div className="text-2xl font-black" style={{ color: "#3D3D3D" }}>{routine.length}</div>
            <div className="text-[9px] font-bold uppercase tracking-wide opacity-50">Routine</div>
          </div>
        </div>

        {rows.length === 0 && (
          <div className="rounded-xl px-4 py-8 text-center border" style={{ borderColor: "#EAEAEA" }}>
            <p className="text-sm font-bold mb-1" style={{ color: "#3D3D3D" }}>Queue clear</p>
            <p className="text-xs mb-3" style={{ color: "#999" }}>No active incidents right now.</p>
            {isCoord && <PullButton inline />}
          </div>
        )}

        {/* Elevated first */}
        {elev.length > 0 && (
          <div>
            <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
               style={{ color: "#CE2033" }}>
              Elevated &mdash; {elev.length}
            </p>
            <div className="flex flex-col gap-1.5">
              {elev.map(r => (
                <Link key={r.id} href={"/coordinator/" + r.id} style={{ textDecoration: "none" }}>
                  <div className="rounded-xl px-4 py-3 border flex items-center gap-3"
                       style={{ background: "#FFF8F8", borderColor: "#FFCCCC", borderLeft: "3px solid #CE2033" }}>
                    <div className="flex-1">
                      <p className="text-sm font-bold" style={{ color: "#3D3D3D" }}>
                        {r.student ? r.student.last_name + ", " + r.student.first_name : "Unknown"}
                        <span className="ml-1.5 text-[10px] font-normal"
                              style={{ color: "#999" }}>Gr {r.student?.grade}</span>
                      </p>
                      <p className="text-[10px]" style={{ color: "#999" }}>
                        {minsAgo(r.reported_at)}
                        {r.block_id ? " · Block " + r.block_id : ""}
                        {r.reporter ? " · " + r.reporter.display_name : ""}
                      </p>
                    </div>
                    {r.status === "located" && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: "#EEF6FF", color: "#1E5FA6" }}>Located</span>
                    )}
                    <span style={{ color: "#BABABA" }}>&rarr;</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Routine */}
        {routine.length > 0 && (
          <div>
            <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
               style={{ color: "#3D3D3D", opacity: 0.35 }}>
              Routine &mdash; {routine.length}
            </p>
            <div className="flex flex-col gap-1.5">
              {routine.map(r => (
                <Link key={r.id} href={"/coordinator/" + r.id} style={{ textDecoration: "none" }}>
                  <div className="rounded-xl px-4 py-3 border flex items-center gap-3"
                       style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
                    <div className="flex-1">
                      <p className="text-sm font-bold" style={{ color: "#3D3D3D" }}>
                        {r.student ? r.student.last_name + ", " + r.student.first_name : "Unknown"}
                        <span className="ml-1.5 text-[10px] font-normal"
                              style={{ color: "#999" }}>Gr {r.student?.grade}</span>
                      </p>
                      <p className="text-[10px]" style={{ color: "#999" }}>
                        {minsAgo(r.reported_at)}
                        {r.block_id ? " · Block " + r.block_id : ""}
                        {r.reporter ? " · " + r.reporter.display_name : ""}
                      </p>
                    </div>
                    {r.status === "located" && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: "#EEF6FF", color: "#1E5FA6" }}>Located</span>
                    )}
                    <span style={{ color: "#BABABA" }}>&rarr;</span>
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
