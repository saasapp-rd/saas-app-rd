import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import Link from "next/link"
import StepActions from "@/components/coordinator/StepActions"
import NoteThread from "@/components/coordinator/NoteThread"
import LocateForm from "@/components/coordinator/LocateForm"
import ResolveButton from "@/components/coordinator/ResolveButton"

const ALLOWED = ["coordinator", "counselor", "dean", "admin", "super_admin"]

// Normalise a Supabase join that may come back as array or single object
function norm<T>(val: unknown): T | null {
  if (!val) return null
  return (Array.isArray(val) ? val[0] ?? null : val) as T | null
}

export default async function IncidentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!ALLOWED.includes(session.user.role)) redirect("/dashboard")

  const [incResult, notesResult] = await Promise.all([
    db.from("incidents")
      .select("id, level, status, reported_at, block_id, room, suppress_email_home, step_1_sent_at, step_2_sent_at, step_3_expires_at, step_4_logged_at, step_5_logged_at, step_6_sent_at, located_location, located_excused, resolved_at, student_id, students(id, first_name, last_name, grade), reporter:reported_by(display_name), course:course_id(name, room)")
      .eq("id", id)
      .single(),
    db.from("incident_notes")
      .select("id, body, created_at, author:user_id(display_name)")
      .eq("incident_id", id)
      .order("created_at", { ascending: true }),
  ])

  if (incResult.error || !incResult.data) notFound()
  const inc = incResult.data as any

  // Normalise all joined fields (Supabase returns joins as arrays)
  const student  = norm<{ id: string; first_name: string; last_name: string; grade: number }>(inc.students)
  const reporter = norm<{ display_name: string }>(inc.reporter)
  const course   = norm<{ name: string; room: string | null }>(inc.course)

  const notes = (notesResult.data ?? []).map((n: any) => ({
    id:         n.id         as string,
    body:       n.body       as string,
    created_at: n.created_at as string,
    author:     norm<{ display_name: string }>(n.author),
  }))

  const isElev     = inc.level  === "elevated"
  const isResolved = inc.status === "resolved"
  const isLocated  = inc.status === "located"
  const minsOpen   = Math.floor((Date.now() - new Date(inc.reported_at).getTime()) / 60000)

  const showLocateForm = !!inc.step_4_logged_at && inc.status === "open" && !inc.located_location
  const showResolveBtn = isLocated && !isResolved

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
              {student ? (
                <Link href={"/students/" + student.id} style={{ textDecoration: "none" }}>
                  <p className="font-bold" style={{ color: "#A6192E" }}>
                    {student.last_name + ", " + student.first_name}
                    <span style={{ color: "#3D3D3D", fontWeight: "normal" }}> (Gr {student.grade})</span>
                    <span className="ml-1 text-[9px]">&#x2197;</span>
                  </p>
                </Link>
              ) : (
                <p className="font-bold" style={{ color: "#3D3D3D" }}>Unknown</p>
              )}
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
                  Block 1 &mdash; email home suppressed
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

        {/* Located banner */}
        {isLocated && (
          <div className="rounded-xl px-4 py-3"
               style={{ background: "#EEF6FF", border: "1px solid #93C5FD" }}>
            <p className="text-sm font-bold mb-0.5" style={{ color: "#1E5FA6" }}>Student Located</p>
            {inc.located_location && (
              <p className="text-xs" style={{ color: "#1D4ED8" }}>
                {inc.located_location}{inc.located_excused ? " · Excused" : ""}
              </p>
            )}
          </div>
        )}

        {showLocateForm && <LocateForm incidentId={inc.id} />}
        {showResolveBtn && <ResolveButton incidentId={inc.id} />}

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

        {/* Notes */}
        <div>
          <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
             style={{ color: "#3D3D3D", opacity: 0.35 }}>
            Notes {notes.length > 0 ? "— " + notes.length : ""}
          </p>
          <NoteThread incidentId={inc.id} initialNotes={notes} />
        </div>
      </main>
    </div>
  )
}
