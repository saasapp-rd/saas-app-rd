import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"

const INCIDENTS = [
  { name: "Smith, John",  level: "elevated", mins: 12, detail: "Left Rm 204 upset",    step: "Step 3 — waiting" },
  { name: "Lee, Marcus",  level: "routine",  mins: 4,  detail: "Absent from start",     step: "Step 1 — sent"    },
]

const TRIAGE = [
  { name: "Doe, Jane",   grade: 10 },
  { name: "Torres, Maya", grade: 10 },
]

export default async function CoordinatorPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!["coordinator", "dean", "admin", "super_admin"].includes(session.user.role)) redirect("/dashboard")

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between" style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">Block 3 &mdash; 11:52am</div>
          <div className="text-white text-[10px] opacity-70">Coordinator: {session.user.displayName}</div>
        </div>
        <SignOutButton />
      </header>

      <TestModeBanner name={session.user.displayName} role={session.user.role} />

      <main className="flex-1 flex flex-col px-5 py-5 gap-5 max-w-lg mx-auto w-full">

        {/* Triage */}
        <div>
          <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2" style={{ color: "#3D3D3D", opacity: 0.35 }}>Imperfect Attendance Triage</p>
          <div className="flex flex-col gap-2">
            {TRIAGE.map((s) => (
              <div key={s.name} className="rounded-xl p-3 border" style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
                <div className="text-sm font-bold mb-2" style={{ color: "#3D3D3D" }}>
                  {s.name} <span className="font-normal text-xs opacity-50">Gr {s.grade}</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button className="px-3 py-1.5 rounded-lg text-[10px] font-bold" style={{ background: "#EAEAEA", color: "#3D3D3D" }}>Sports dismissal</button>
                  <button className="px-3 py-1.5 rounded-lg text-[10px] font-bold" style={{ background: "#EAEAEA", color: "#3D3D3D" }}>Parent update</button>
                  <button className="px-3 py-1.5 rounded-lg text-[10px] font-bold" style={{ background: "#CE2033", color: "#fff" }}>Confirm missing</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="h-px" style={{ background: "#EAEAEA" }} />

        {/* Incident feed */}
        <div>
          <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2" style={{ color: "#3D3D3D", opacity: 0.35 }}>Open Incidents &mdash; {INCIDENTS.length} active</p>
          <div className="flex flex-col gap-2">
            {INCIDENTS.map((inc) => (
              <div
                key={inc.name}
                className="rounded-xl p-3 border-l-4"
                style={{
                  background:   inc.level === "elevated" ? "#FFF8F8" : "#FFFDF0",
                  borderColor:  inc.level === "elevated" ? "#CE2033" : "#F0C040",
                  border:       `1.5px solid ${inc.level === "elevated" ? "#CE2033" : "#F0C040"}`,
                  borderLeft:   `4px solid ${inc.level === "elevated" ? "#CE2033" : "#F0C040"}`,
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[9px] font-bold tracking-[0.1em] uppercase px-2 py-0.5 rounded-full"
                      style={{
                        background: inc.level === "elevated" ? "#FFF0F0" : "#FFF8E0",
                        color:      inc.level === "elevated" ? "#A6192E" : "#8B6200",
                      }}
                    >
                      {inc.level}
                    </span>
                    <span className="text-sm font-bold" style={{ color: "#3D3D3D" }}>{inc.name}</span>
                  </div>
                  <span className="text-xs font-bold" style={{ color: inc.level === "elevated" ? "#CE2033" : "#999" }}>
                    {inc.mins} min
                  </span>
                </div>
                <p className="text-[10px] mb-2" style={{ color: "#999" }}>{inc.detail} &mdash; {inc.step}</p>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-white" style={{ background: "#A6192E" }}>Open</button>
                  <button className="px-3 py-1.5 rounded-lg text-[10px] font-bold" style={{ background: "#EAEAEA", color: "#3D3D3D" }}>With Me</button>
                  <button className="px-3 py-1.5 rounded-lg text-[10px] font-bold" style={{ background: "#EAEAEA", color: "#3D3D3D" }}>Found</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="h-px" style={{ background: "#EAEAEA" }} />

        <button
          className="w-full py-4 rounded-xl text-sm font-semibold border"
          style={{ borderColor: "#A6192E", color: "#A6192E", background: "transparent" }}
        >
          + Report Welfare Concern
        </button>
      </main>
    </div>
  )
}
