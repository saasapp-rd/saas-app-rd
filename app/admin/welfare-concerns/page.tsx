import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import Link from "next/link"

export const dynamic = "force-dynamic"

function norm<T>(val: unknown): T | null {
  if (!val) return null
  return (Array.isArray(val) ? val[0] ?? null : val) as T | null
}

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1)  return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default async function WelfareConcernsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!["admin", "super_admin"].includes(session.user.role)) redirect("/dashboard")

  // Welfare concerns = incidents with report_type = 'welfare_concern'
  // Show last 90 days
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const { data } = await db
    .from("incidents")
    .select("id, status, level, reported_at, students(first_name, last_name, grade), reporter:reported_by(display_name)")
    .eq("report_type", "welfare_concern")
    .gte("reported_at", since)
    .order("reported_at", { ascending: false })

  type Row = {
    id: string
    status: string
    level: string
    reported_at: string
    student: { first_name: string; last_name: string; grade: number } | null
    reporter: { display_name: string } | null
  }

  const rows: Row[] = ((data ?? []) as any[]).map(r => ({
    id:          r.id,
    status:      r.status,
    level:       r.level,
    reported_at: r.reported_at,
    student:     norm<{ first_name: string; last_name: string; grade: number }>(r.students),
    reporter:    norm<{ display_name: string }>(r.reporter),
  }))

  const open     = rows.filter(r => r.status === "open")
  const resolved = rows.filter(r => r.status !== "open")

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between"
              style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">
            Welfare Concerns
          </div>
          <div className="text-white text-[10px] opacity-70">
            {open.length} open · {rows.length} last 90 days
          </div>
        </div>
        <SignOutButton />
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />
      <nav className="px-5 py-2 border-b flex items-center gap-4" style={{ borderColor: "#EAEAEA" }}>
        <Link href="/dashboard" className="text-xs font-bold"
              style={{ color: "#A6192E", textDecoration: "none" }}>
          &larr; Dashboard
        </Link>
        <Link href="/admin" className="text-xs"
              style={{ color: "#999", textDecoration: "none" }}>
          Admin
        </Link>
      </nav>

      <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full flex flex-col gap-5">

        {rows.length === 0 ? (
          <div className="rounded-xl px-4 py-8 text-center border" style={{ borderColor: "#EAEAEA" }}>
            <p className="text-sm font-bold mb-1" style={{ color: "#3D3D3D" }}>No welfare concerns</p>
            <p className="text-xs" style={{ color: "#999" }}>None reported in the last 90 days.</p>
          </div>
        ) : (
          <>
            {open.length > 0 && (
              <div>
                <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
                   style={{ color: "#A6192E", opacity: 0.8 }}>
                  Open — {open.length}
                </p>
                <div className="flex flex-col gap-1.5">
                  {open.map(r => (
                    <Link key={r.id} href={"/coordinator/" + r.id} style={{ textDecoration: "none" }}>
                      <div className="rounded-xl px-4 py-3 border flex items-center justify-between"
                           style={{ background: "#FFF8F8", borderColor: "#FFCCCC" }}>
                        <div>
                          <p className="text-sm font-bold" style={{ color: "#A6192E" }}>
                            {r.student
                              ? r.student.last_name + ", " + r.student.first_name
                              : "Unknown student"}
                            {r.student && <span className="ml-1.5 text-[10px] font-normal" style={{ color: "#999" }}>Gr {r.student.grade}</span>}
                          </p>
                          <p className="text-[10px] mt-0.5" style={{ color: "#999" }}>
                            Reported by {r.reporter?.display_name ?? "Unknown"} · {timeAgo(r.reported_at)}
                          </p>
                        </div>
                        <span style={{ color: "#BABABA" }}>›</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {resolved.length > 0 && (
              <div>
                <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
                   style={{ color: "#3D3D3D", opacity: 0.35 }}>
                  Resolved — {resolved.length}
                </p>
                <div className="flex flex-col gap-1.5">
                  {resolved.map(r => (
                    <Link key={r.id} href={"/coordinator/" + r.id} style={{ textDecoration: "none" }}>
                      <div className="rounded-xl px-4 py-3 border flex items-center justify-between"
                           style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: "#3D3D3D" }}>
                            {r.student
                              ? r.student.last_name + ", " + r.student.first_name
                              : "Unknown student"}
                            {r.student && <span className="ml-1.5 text-[10px] font-normal" style={{ color: "#999" }}>Gr {r.student.grade}</span>}
                          </p>
                          <p className="text-[10px] mt-0.5" style={{ color: "#999" }}>
                            {r.reporter?.display_name ?? "Unknown"} · {timeAgo(r.reported_at)}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                              style={{ background: "#F0FDF4", color: "#166534" }}>
                          Resolved
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
