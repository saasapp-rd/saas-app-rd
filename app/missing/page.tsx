import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import Link from "next/link"

const CAN_SEE_LEVEL    = ["coordinator", "counselor", "dean", "admin", "super_admin"]
const CAN_OPEN_WORKFLOW = ["coordinator", "dean", "admin", "super_admin"]

const MY_VIEW: Record<string, { label: string; href: string }> = {
  teacher:     { label: "My Roster",   href: "/teacher"     },
  coordinator: { label: "My Workflow", href: "/coordinator" },
  counselor:   { label: "My View",     href: "/counselor"   },
  dean:        { label: "Dean View",   href: "/dean"        },
  admin:       { label: "Admin",       href: "/admin"       },
  super_admin: { label: "Admin",       href: "/admin"       },
  staff:       { label: "Staff View",  href: "/staff"       },
}

interface Incident {
  id:          string
  level:       "routine" | "elevated"
  status:      string
  reported_at: string
  block_id:    number | null
  room:        string | null
  suppress_email_home: boolean
  students:    { first_name: string; last_name: string; grade: number } | null
  reporter:    { display_name: string } | null
}

function minsAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
}

export default async function MissingPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (["student"].includes(session.user.role)) redirect("/student")

  const { data: raw } = await db
    .from("incidents")
    .select("id, level, status, reported_at, block_id, room, suppress_email_home, students(first_name, last_name, grade), reporter:reported_by(display_name)")
    .eq("status", "open")
    .order("level",       { ascending: false })
    .order("reported_at", { ascending: true  })

  const incidents = (raw ?? []) as unknown as Incident[]
  const role      = session.user.role
  const myView    = MY_VIEW[role]
  const canLevel  = CAN_SEE_LEVEL.includes(role)
  const canWork   = CAN_OPEN_WORKFLOW.includes(role)
  const elevated  = incidents.filter(i => i.level === "elevated")
  const routine   = incidents.filter(i => i.level === "routine")

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between" style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">
            Missing Students
            {incidents.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px]"
                    style={{ background: "rgba(255,255,255,0.25)" }}>
                {incidents.length}
              </span>
            )}
          </div>
          <div className="text-white text-[10px] opacity-70">{session.user.displayName}</div>
        </div>
        <div className="flex items-center gap-3">
          {myView && (
            <Link href={myView.href}
              className="text-white text-[10px] font-bold opacity-80 hover:opacity-100"
              style={{ textDecoration: "none" }}>
              {myView.label} &rarr;
            </Link>
          )}
          <SignOutButton />
        </div>
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />

      <main className="flex-1 flex flex-col px-5 py-5 gap-4 max-w-lg mx-auto w-full">
        {incidents.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-16 gap-3">
            <div className="text-4xl">&#x2705;</div>
            <p className="text-sm font-bold" style={{ color: "#3D3D3D" }}>All students accounted for</p>
            <p className="text-xs" style={{ color: "#999" }}>No open incidents right now.</p>
          </div>
        )}

        {elevated.length > 0 && (
          <div>
            <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
               style={{ color: "#CE2033", opacity: 0.8 }}>
              Elevated &mdash; {elevated.length}
            </p>
            <div className="flex flex-col gap-2">
              {elevated.map(inc => (
                <IncidentCard key={inc.id} inc={inc} canLevel={canLevel} canWork={canWork} />
              ))}
            </div>
          </div>
        )}

        {routine.length > 0 && (
          <div>
            <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
               style={{ color: "#3D3D3D", opacity: 0.35 }}>
              Routine &mdash; {routine.length}
            </p>
            <div className="flex flex-col gap-2">
              {routine.map(inc => (
                <IncidentCard key={inc.id} inc={inc} canLevel={canLevel} canWork={canWork} />
              ))}
            </div>
          </div>
        )}
      </main>

      <div className="px-5 py-4 border-t flex gap-3" style={{ borderColor: "#EAEAEA" }}>
        <Link href="/teacher"
          className="flex-1 py-3 rounded-xl text-xs font-bold text-center"
          style={{ background: "#EAEAEA", color: "#3D3D3D", textDecoration: "none" }}>
          + Report from Roster
        </Link>
      </div>
    </div>
  )
}

function IncidentCard({
  inc, canLevel, canWork,
}: {
  inc:      Incident
  canLevel: boolean
  canWork:  boolean
}) {
  const student  = inc.students
  const reporter = inc.reporter
  const mins     = minsAgo(inc.reported_at)
  const isElev   = inc.level === "elevated"
  const accentColor = isElev ? "#CE2033" : "#F0C040"

  return (
    <div
      className="rounded-xl p-3"
      style={{
        background:  isElev ? "#FFF8F8" : "#FFFDF0",
        border:      "1.5px solid " + accentColor,
        borderLeft:  "4px solid "   + accentColor,
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {canLevel && (
            <span
              className="text-[9px] font-bold tracking-[0.1em] uppercase px-2 py-0.5 rounded-full"
              style={{
                background: isElev ? "#FFF0F0" : "#FFF8E0",
                color:      isElev ? "#A6192E" : "#8B6200",
              }}
            >
              {inc.level}
            </span>
          )}
          <span className="text-sm font-bold" style={{ color: "#3D3D3D" }}>
            {student ? student.last_name + ", " + student.first_name : "Unknown student"}
          </span>
          {student && (
            <span className="text-[10px]" style={{ color: "#999" }}>Gr {student.grade}</span>
          )}
        </div>
        <span className="text-xs font-bold" style={{ color: isElev ? "#CE2033" : "#999" }}>
          {mins < 1 ? "just now" : mins + "m"}
        </span>
      </div>

      <p className="text-[10px] mb-2" style={{ color: "#999" }}>
        {inc.block_id ? "Block " + inc.block_id : ""}
        {inc.room ? " · " + inc.room : ""}
        {reporter ? " · reported by " + reporter.display_name : ""}
        {inc.suppress_email_home ? " · No email (Block 1)" : ""}
      </p>

      {canWork && (
        <div className="flex gap-2">
          <Link
            href="/coordinator"
            className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-white"
            style={{ background: "#A6192E", textDecoration: "none" }}>
            Open Workflow
          </Link>
        </div>
      )}
    </div>
  )
}
