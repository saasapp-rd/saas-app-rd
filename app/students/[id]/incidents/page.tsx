import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/supabase"
import { fetchAllPaginated } from "@/lib/dbHelpers"
import SignOutButton from "@/components/SignOutButton"
import Link from "next/link"
import IncidentDrilldown, { type IncidentRow } from "@/components/admin/IncidentDrilldown"

export const dynamic = "force-dynamic"

const ALLOWED       = ["coordinator","counselor","dean","admin","super_admin"]
const DELETE_ROLES  = ["admin","super_admin"]

export default async function StudentIncidentsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!ALLOWED.includes(session.user.role)) redirect("/dashboard")

  // Student record — minimal fields just for the header.
  const { data: stuRow } = await db
    .from("users")
    .select("id, first_name, last_name, grade, veracross_id")
    .eq("id", id)
    .maybeSingle()
  if (!stuRow) notFound()

  const student = stuRow as {
    id: string; first_name: string | null; last_name: string | null
    grade: number | null; veracross_id: string | null
  }

  // Every incident for this student. Paginated past PostgREST's 1000-row
  // cap in case a student has years of history. Welfare concerns
  // included here because admin may want to delete or audit those too —
  // they're tagged in the UI so it's clear which is which.
  const incidents = await fetchAllPaginated<IncidentRow>(() =>
    db.from("incidents")
      .select("id, level, status, report_type, reported_at, resolved_at, located_location, located_excused, block_id, reporter:reported_by(display_name)")
      .eq("student_id", id)
      .order("reported_at", { ascending: false })
  )

  const canDelete = DELETE_ROLES.includes(session.user.role)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between"
              style={{ background: "#A6192E" }}>
        <div className="min-w-0">
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">Missing Student Data</div>
          <div className="text-white text-[10px] opacity-70 truncate">
            {student.last_name}, {student.first_name}
            {student.grade != null ? ` · Grade ${student.grade}` : ""}
            {student.veracross_id ? ` · ID ${student.veracross_id}` : ""}
          </div>
        </div>
        <SignOutButton />
      </header>

      <nav className="px-5 py-2 border-b flex items-center gap-4" style={{ borderColor: "#EAEAEA" }}>
        <Link href={`/students/${id}`}
              className="text-xs font-bold"
              style={{ color: "#A6192E", textDecoration: "none" }}>
          &larr; Profile / Schedule
        </Link>
      </nav>

      <main className="flex-1 px-5 py-5 max-w-2xl mx-auto w-full flex flex-col gap-5">
        <IncidentDrilldown
          studentId={id}
          studentName={`${student.last_name ?? ""}, ${student.first_name ?? ""}`}
          incidents={incidents}
          canDelete={canDelete}
        />
      </main>
    </div>
  )
}
