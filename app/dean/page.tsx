import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"

const STUDENTS = [
  { rank: 1, name: "Smith, John",  grade: 11, incidents: 6, blocks: "1,3,3,5,7", flag: "elevated", trend: "↑ worse"  },
  { rank: 2, name: "Doe, Jane",    grade: 10, incidents: 4, blocks: "2,2,6,8",   flag: "watch",    trend: "→ same"   },
  { rank: 3, name: "Lee, Marcus",  grade: 10, incidents: 3, blocks: "1,3,5",     flag: "none",     trend: "↓ better" },
  { rank: 4, name: "Torres, Maya", grade: 10, incidents: 2, blocks: "4,8",       flag: "none",     trend: "↓ better" },
]

const DOT: Record<string, string> = { elevated: "#CE2033", watch: "#F0C040", none: "#CCCCCC" }

export default async function DeanPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!["dean", "admin", "super_admin"].includes(session.user.role)) redirect("/dashboard")

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between" style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">Pattern Dashboard</div>
          <div className="text-white text-[10px] opacity-70">All Students &mdash; This Week</div>
        </div>
        <SignOutButton />
      </header>

      <TestModeBanner name={session.user.displayName} role={session.user.role} />

      <main className="flex-1 flex flex-col px-5 py-5 gap-5 max-w-lg mx-auto w-full">

        {/* Time range toggle */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "#F0F0F0" }}>
          {["This Week", "Month", "Semester"].map((t, i) => (
            <div key={t} className="flex-1 text-center py-1.5 rounded-md text-xs font-bold"
              style={i === 0 ? { background: "#fff", color: "#A6192E", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" } : { color: "#999" }}>
              {t}
            </div>
          ))}
        </div>

        {/* Auto-surfaced alert */}
        <div className="rounded-xl p-3 border" style={{ background: "#FFF8F8", borderColor: "#CE2033", borderLeft: "4px solid #CE2033" }}>
          <p className="text-[9px] font-bold tracking-[0.2em] uppercase mb-1" style={{ color: "#A6192E" }}>⚠ Auto-Surfaced Pattern</p>
          <p className="text-sm font-bold" style={{ color: "#3D3D3D" }}>Smith, John &mdash; Gr 11</p>
          <p className="text-[10px]" style={{ color: "#999" }}>Same-day multi-block: 2 days this week &middot; 6 incidents total</p>
        </div>

        {/* Student rankings */}
        <div>
          <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2" style={{ color: "#3D3D3D", opacity: 0.35 }}>All Students &mdash; Ranked by Incidents</p>
          <div className="flex flex-col divide-y">
            {STUDENTS.map((s) => (
              <div key={s.name} className="flex items-center gap-3 py-3">
                <div className="text-xs font-black w-4" style={{ color: s.rank === 1 ? "#CE2033" : "#CCCCCC" }}>{s.rank}</div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: "#EAEAEA", color: "#888" }}>
                  {s.name.split(", ").map(n => n[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold" style={{ color: "#3D3D3D" }}>{s.name}</div>
                  <div className="text-[10px]" style={{ color: "#999" }}>{s.incidents} incidents &middot; Blks {s.blocks}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: DOT[s.flag] }} />
                  <span className="text-[9px] font-semibold" style={{ color: "#999" }}>{s.trend}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="h-px" style={{ background: "#EAEAEA" }} />

        <button className="w-full py-4 rounded-xl text-sm font-semibold border" style={{ borderColor: "#A6192E", color: "#A6192E", background: "transparent" }}>
          View All Active Incidents
        </button>
      </main>
    </div>
  )
}
