import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"

const CASELOAD = [
  { name: "Smith, John", grade: 11, incidents: 6, flag: "elevated", active: true  },
  { name: "Doe, Jane",   grade: 10, incidents: 4, flag: "watch",    active: false },
  { name: "Lee, Marcus", grade: 10, incidents: 3, flag: "none",     active: true  },
]

const FLAG_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  elevated: { bg: "#FFF0F0", color: "#A6192E", label: "Elevated" },
  watch:    { bg: "#FFF8E0", color: "#8B6200", label: "Watch"    },
  none:     { bg: "#EAEAEA", color: "#666",    label: "No flag"  },
}

export default async function CounselorPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!["counselor", "admin", "super_admin"].includes(session.user.role)) redirect("/dashboard")

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between" style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">Counselor Dashboard</div>
          <div className="text-white text-[10px] opacity-70">Block 3 &mdash; 11:52am</div>
        </div>
        <SignOutButton />
      </header>

      <TestModeBanner name={session.user.displayName} role={session.user.role} />

      <main className="flex-1 flex flex-col px-5 py-5 gap-5 max-w-lg mx-auto w-full">

        {/* Toggle */}
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "#F0F0F0" }}>
          <div className="flex-1 text-center py-1.5 rounded-md text-xs font-bold" style={{ background: "#fff", color: "#A6192E", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>My Caseload</div>
          <div className="flex-1 text-center py-1.5 rounded-md text-xs font-bold" style={{ color: "#999" }}>All Students</div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-3" style={{ background: "#F7F7F7" }}>
            <div className="text-2xl font-black" style={{ color: "#A6192E" }}>3</div>
            <div className="text-[9px] font-bold uppercase tracking-wide opacity-50">Caseload students</div>
          </div>
          <div className="rounded-xl p-3" style={{ background: "#F7F7F7" }}>
            <div className="text-2xl font-black" style={{ color: "#A6192E" }}>2</div>
            <div className="text-[9px] font-bold uppercase tracking-wide opacity-50">Active now</div>
          </div>
        </div>

        {/* Caseload list */}
        <div>
          <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2" style={{ color: "#3D3D3D", opacity: 0.35 }}>Patterns &mdash; This Week</p>
          <div className="flex flex-col divide-y" style={{ borderColor: "#F2F2F2" }}>
            {CASELOAD.map((s) => {
              const f = FLAG_STYLE[s.flag]
              return (
                <div key={s.name} className="flex items-center gap-3 py-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: "#EAEAEA", color: "#888" }}>
                    {s.name.split(", ").map(n => n[0]).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold" style={{ color: "#3D3D3D" }}>{s.name}</div>
                    <div className="text-[10px]" style={{ color: "#999" }}>{s.incidents} incidents &middot; Gr {s.grade}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wide uppercase" style={{ background: f.bg, color: f.color }}>{f.label}</span>
                    {s.active && <span className="text-[9px] font-bold" style={{ color: "#CE2033" }}>Active now</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="h-px" style={{ background: "#EAEAEA" }} />

        <button className="w-full py-4 rounded-xl text-sm font-semibold" style={{ background: "#EAEAEA", color: "#3D3D3D" }}>
          Search All Students
        </button>
      </main>
    </div>
  )
}
