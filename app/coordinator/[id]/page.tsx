import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import Link from "next/link"
import StepActions from "@/components/coordinator/StepActions"

// Deans and counselors now have full workflow access (Gail feedback)
const ALLOWED = ["coordinator", "counselor", "dean", "admin", "super_admin"]

export default async function IncidentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!ALLOWED.includes(session.user.role)) redirect("/dashboard")

  const { data: inc, error } = await db
    .from("incidents")
    .select("id, level, status, reported_at, block_id, room, suppress_email_home, step_1_sent_at, step_2_sent_at, step_3_expires_at, step_4_logged_at, step_5_logged_at, step_6_sent_at, located_location, located_excused, resolved_at, students(first_name, last_name, grade), reporter:reported_by(display_name), course:course_id(name, room)")
    .eq("id", id)
    .single()

  if (error || !inc) notFound()

  const student    = inc.students as { first_name: string; last_name: string; grade: number } | null
  const reporter   = inc.reporter as { display_name: string } | null
  const course     = inc.course   as { name: string; room: string | null } | null
  const isElev     = inc.level    === "elevated"
  const isResolved = inc.status   === "resolved"
  const minsOpen   = Math.floor((Date.now() - new Date(inc.reported_at).getTime()) / 60000)

  // Role-aware back navigation
  const role      = session.user.role
  const backHref  = role === "counselor" ? "/counselor"
                  : role === "dean"      ? "/dean"
                  : "/coordinator"
  const backLabel = role === "counselor" ? "Counselor"
                  : role === "dean"      ? "Dean View"
                  : "Coordinator"

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between"
              style={{ background: isElev ? "#8B1020" : "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">
            {isElev ? "Elevated" : "Routine"} Incident
          </div>
          <div className="text-white text-[10px] opacity-70">
            {student ? student.last_name + ", " + student.first_name : "Unknown student"}
          </div>
        </div>
        <SignOutButton />
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />
      <nav className="px-5 py-2 border-b flex items-center gap-4" style={{ borderColor: "#EAEAEA" }}>
        <Link href={backHref} className="text-xs font-bold"
              style={{ color: "#A6192E", textDecoration: "none" }}>
          &larr; {backLabel}
        </Link>
        <Link href="/missing" className="text-xs"
              style={{ color: "#999", textDecoration: "none" }}>
          All Missing
        </Link>
      </nav>

      <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full flex flex-col gap-5">

        {/* Incident summary */}
        <div className="rounded-xl p-4 border" style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-[9px] uppercase tracking-[0.15em] font-bold mb-0.5"
                 style={{ color: "#3D3D3D", opacity: 0.4 }}>Student</p>
              <p className="font-bold" style={{ color: "#3D3D3D" }}>
                {student ? student.last_name + ", " + student.first_name : "—"}
                {student ? " (Gr " + student.grade + ")" : ""}
              </p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.15em] font-bold mb-0.5"
                 style={{ color: "#3D3D3D", opacity: 0.4 }}>Reported By</p>
              <p className="font-bold" style={{ color: "#3D3D3D" }}>
                {reporter?.display_name ?? "Unknown"}
              </p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.15em] font-bold mb-0.5"
                 style={{ color: "#3D3D3D", opacity: 0.4 }}>Block / Room</p>
              <p className="font-bold" style={{ color: "#3D3D3D" }}>
                {inc.block_id ? "Block " + inc.block_id : "—"}
                {inc.room ? " · " + inc.room : ""}
              </p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.15em] font-bold mb-0.5"
                 style={{ color: "#3D3D3D", opacity: 0.4 }}>Time Open</p>
              <p className="font-bold" style={{ color: isElev ? "#CE2033" : "#3D3D3D" }}>
                {minsOpen < 1 ? "Just now" : minsOpen + " min"}
              </p>
            </div>
            {course && (
              <div className="col-span-2">
                <p className="text-[9px] uppercase tracking-[0.15em] font-bold mb-0.5"
                   style={{ color: "#3D3D3D", opacity: 0.4 }}>Course</p>
                <p className="font-bold" style={{ color: "#3D3D3D" }}>{course.name}</p>
              </div>
            )}
            {inc.suppress_email_home && (
              <div className="col-span-2">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded"
                      style={{ background: "#FFF8E0", color: "#8B6200" }}>
                  Block 1 — email home suppressed
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Resolved banner */}
        {isResolved && (
          <div className="rounded-xl px-4 py-3 text-center"
               style={{ background: "#F0FDF4", border: "1px solid #22C55E" }}>
            <p className="text-sm font-bold mb-0.5" style={{ color: "#166534" }}>Incident Resolved</p>
            {inc.located_location && (
              <p className="text-xs" style={{ color: "#16A34A" }}>
                {inc.located_location}
                {inc.located_excused ? " · Excused" : ""}
              </p>
            )}
          </div>
        )}

        {/* 6-step workflow */}
        <div>
          <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
             style={{ color: "#3D3D3D", opacity: 0.35 }}>
            6-Step Protocol
          </p>
          <StepActions incident={{
            id:                  inc.id,
            level:               inc.level,
            status:              inc.status,
            suppress_email_home: inc.suppress_email_home ?? false,
            step_1_sent_at:      inc.step_1_sent_at    ?? null,
            step_2_sent_at:      inc.step_2_sent_at    ?? null,
            step_3_expires_at:   inc.step_3_expires_at ?? null,
            step_4_logged_at:    inc.step_4_logged_at  ?? null,
            step_5_logged_at:    inc.step_5_logged_at  ?? null,
            step_6_sent_at:      inc.step_6_sent_at    ?? null,
          }} />
        </div>
      </main>
    </div>
  )
}
