import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import Link from "next/link"

// Roles that can see incident level (elevated / routine)
const CAN_SEE_LEVEL = ["coordinator", "counselor", "dean", "admin", "super_admin"]

// Roles that can open the full coordinator workflow
const CAN_OPEN_WORKFLOW = ["coordinator", "admin", "super_admin"]

// Roles that can run imperfect attendance triage
const CAN_TRIAGE = ["coordinator", "dean", "admin", "super_admin"]

// Role → their specific view label and link
const MY_VIEW: Record<string, { label: string; href: string }> = {
  teacher:     { label: "My Roster",          href: "/teacher"     },
  staff:       { label: "Welfare Concern",    href: "/staff"       },
  coordinator: { label: "Triage & Workflow",  href: "/coordinator" },
  counselor:   { label: "Counselor View",     href: "/counselor"   },
  dean:        { label: "Pattern Dashboard",  href: "/dean"        },
  admin:       { label: "Admin",              href: "/admin"       },
  super_admin: { label: "Admin",              href: "/admin"       },
}

// ── Placeholder data (replace with Supabase query in Phase 1) ─────────────────
const ACTIVE_INCIDENTS = [
  {
    id: "1",
    name: "Smith, John",
    grade: 11,
    level: "elevated",
    mins: 12,
    detail: "Left Rm 204 upset",
    block: "Block 3",
    room: "Rm 204",
    step: "Step 3 — waiting for response",
    flag: "elevated",
    flagNote: "Elevated concern — contact counselor",
    reportedBy: "Ms. Jones",
  },
  {
    id: "2",
    name: "Lee, Marcus",
    grade: 10,
    level: "routine",
    mins: 4,
    detail: "Absent from start",
    block: "Block 3",
    room: "Rm 112",
    step: "Step 1 — email sent",
    flag: "none",
    flagNote: "",
    reportedBy: "Mr. Davis",
  },
  {
    id: "3",
    name: "Torres, Maya",
    grade: 10,
    level: "routine",
    mins: 2,
    detail: "Left ~5 min ago → Bathroom",
    block: "Block 3",
    room: "Rm 201",
    step: "Triage pending",
    flag: "watch",
    flagNote: "Monitor — frequent absences Block 3",
    reportedBy: "Dr. Kim",
  },
]

const LEVEL_STYLE = {
  elevated: { dot: "#CE2033", bg: "#FFF8F8", border: "#CE2033", pill: "#FFF0F0", pillText: "#A6192E", label: "ELEVATED" },
  routine:  { dot: "#F0C040", bg: "#FFFDF5", border: "#F0C040", pill: "#FFF8E0", pillText: "#8B6200", label: "ROUTINE"  },
}

const FLAG_DOT: Record<string, string> = { elevated: "#CE2033", watch: "#F0C040", none: "transparent" }

export default async function MissingPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  // Students never see this page
  if (session.user.role === "student") redirect("/student")

  const role        = session.user.role
  const seeLevel    = CAN_SEE_LEVEL.includes(role)
  const canWorkflow = CAN_OPEN_WORKFLOW.includes(role)
  const canTriage   = CAN_TRIAGE.includes(role)
  const myView      = MY_VIEW[role]

  const now = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>

      {/* Top bar */}
      <header className="px-5 py-3.5 flex items-center justify-between" style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">
            Missing Students
          </div>
          <div className="text-white text-[10px] opacity-70">Block 3 &mdash; 11:52am</div>
        </div>
        <div className="flex items-center gap-2">
          {myView && (
            <Link
              href={myView.href}
              className="text-[10px] font-bold tracking-[0.1em] uppercase px-3 py-1.5 rounded-lg"
              style={{ background: "rgba(255,255,255,0.15)", color: "#fff", textDecoration: "none" }}
            >
              {myView.label} &rarr;
            </Link>
          )}
          <SignOutButton />
        </div>
      </header>

      <TestModeBanner name={session.user.displayName} role={role} />

      {/* Triage notice for coordinators / deans */}
      {canTriage && (
        <div
          className="mx-5 mt-4 px-4 py-3 rounded-xl border"
          style={{ background: "#FFF8E0", borderColor: "#F0C040" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold tracking-[0.15em] uppercase" style={{ color: "#8B6200" }}>
                ⏱ Imperfect Attendance
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#6B4C00" }}>
                2 students flagged from Veracross — triage before opening
              </p>
            </div>
            <Link
              href="/coordinator"
              className="text-[10px] font-bold px-3 py-1.5 rounded-lg text-white"
              style={{ background: "#8B6200", textDecoration: "none" }}
            >
              Triage
            </Link>
          </div>
        </div>
      )}

      {/* Incident count header */}
      <div className="px-5 pt-5 pb-2 flex items-center justify-between">
        <div>
          <span className="text-[9px] font-bold tracking-[0.25em] uppercase" style={{ color: "#3D3D3D", opacity: 0.4 }}>
            Active &mdash;
          </span>
          <span className="text-[9px] font-bold tracking-[0.25em] uppercase ml-1" style={{ color: "#CE2033" }}>
            {ACTIVE_INCIDENTS.length} missing
          </span>
        </div>
        <span className="text-[9px]" style={{ color: "#CCCCCC" }}>
          Updated {now}
        </span>
      </div>

      {/* Incident list */}
      <main className="flex-1 flex flex-col px-5 gap-3 pb-24 max-w-lg mx-auto w-full">
        {ACTIVE_INCIDENTS.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16">
            <div className="text-3xl">✅</div>
            <p className="text-base font-bold" style={{ color: "#3D3D3D" }}>All students accounted for</p>
            <p className="text-xs" style={{ color: "#CCCCCC" }}>No active incidents this block</p>
          </div>
        ) : (
          ACTIVE_INCIDENTS.map((inc) => {
            const ls = LEVEL_STYLE[inc.level as keyof typeof LEVEL_STYLE]
            return (
              <div
                key={inc.id}
                className="rounded-xl border-l-4 overflow-hidden"
                style={{
                  background: ls.bg,
                  borderTop: `1px solid ${ls.border}`,
                  borderRight: `1px solid ${ls.border}`,
                  borderBottom: `1px solid ${ls.border}`,
                  borderLeft: `4px solid ${ls.dot}`,
                }}
              >
                <div className="px-4 pt-3 pb-2">
                  {/* Name row */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {/* Flag dot — visible to all */}
                      {inc.flag !== "none" && (
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: FLAG_DOT[inc.flag] }}
                          title={inc.flagNote}
                        />
                      )}
                      <span className="text-sm font-bold" style={{ color: "#3D3D3D" }}>{inc.name}</span>
                      <span className="text-[10px]" style={{ color: "#AAAAAA" }}>Gr {inc.grade}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Level — coordinator / counselor / dean / admin only */}
                      {seeLevel && (
                        <span
                          className="text-[8px] font-bold tracking-[0.1em] uppercase px-2 py-0.5 rounded-full"
                          style={{ background: ls.pill, color: ls.pillText }}
                        >
                          {ls.label}
                        </span>
                      )}
                      <span
                        className="text-xs font-bold"
                        style={{ color: inc.level === "elevated" ? "#CE2033" : "#CCCCCC" }}
                      >
                        {inc.mins} min
                      </span>
                    </div>
                  </div>

                  {/* Detail */}
                  <p className="text-[10px] mb-1" style={{ color: "#888" }}>
                    {inc.block} &middot; {inc.detail}
                  </p>
                  {seeLevel && (
                    <p className="text-[10px]" style={{ color: "#BBBBBB" }}>
                      {inc.step}
                    </p>
                  )}
                </div>

                {/* Action row */}
                <div
                  className="flex gap-2 px-4 py-2 border-t"
                  style={{ borderColor: ls.border, background: "rgba(255,255,255,0.6)" }}
                >
                  <button
                    className="flex-1 py-2 rounded-lg text-[10px] font-bold"
                    style={{ background: "#A6192E", color: "#fff" }}
                  >
                    ✓ With Me
                  </button>
                  <button
                    className="flex-1 py-2 rounded-lg text-[10px] font-bold"
                    style={{ background: "#EAEAEA", color: "#3D3D3D" }}
                  >
                    Found
                  </button>
                  {canWorkflow && (
                    <Link
                      href="/coordinator"
                      className="flex-1 py-2 rounded-lg text-[10px] font-bold text-center"
                      style={{ background: "#3D3D3D", color: "#fff", textDecoration: "none" }}
                    >
                      Workflow →
                    </Link>
                  )}
                </div>
              </div>
            )
          })
        )}
      </main>

      {/* Bottom action bar */}
      <div
        className="fixed bottom-0 left-0 right-0 flex gap-3 px-5 py-4 border-t"
        style={{ background: "#fff", borderColor: "#EAEAEA" }}
      >
        <button
          className="flex-1 py-3.5 rounded-xl text-sm font-semibold border"
          style={{ borderColor: "#A6192E", color: "#A6192E", background: "transparent" }}
        >
          + Report Concern
        </button>
        <button
          className="flex-1 py-3.5 rounded-xl text-sm font-semibold"
          style={{ background: "#EAEAEA", color: "#3D3D3D" }}
        >
          Student With Me
        </button>
      </div>

    </div>
  )
}
