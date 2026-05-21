import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/supabase"
import { fetchAllPaginated } from "@/lib/dbHelpers"
import SignOutButton from "@/components/SignOutButton"
import BackLink from "@/components/BackLink"
import TestModeBanner from "@/components/TestModeBanner"
import CounselorCaseloads, { type Counselor, type Student } from "@/components/admin/CounselorCaseloads"

export const dynamic = "force-dynamic"

export default async function CounselorsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!["admin", "super_admin"].includes(session.user.role)) redirect("/dashboard")

  const [
    { data: counselorRows },
    studentRows,
    caseloadRows,
  ] = await Promise.all([
    db.from("users")
      .select("id, display_name, first_name, last_name")
      .eq("role", "counselor")
      .eq("is_active", true)
      .order("display_name"),
    // Active students — paginate past PostgREST's 1000-row cap.
    fetchAllPaginated<Student>(() =>
      db.from("users")
        .select("id, first_name, last_name, grade, veracross_id")
        .eq("role", "student")
        .eq("is_active", true)
        .order("last_name")
        .order("first_name")
    ),
    fetchAllPaginated<{ counselor_id: string; student_id: string }>(() =>
      db.from("counselor_caseload")
        .select("counselor_id, student_id")
    ),
  ])

  const counselors: Counselor[] = ((counselorRows ?? []) as {
    id: string; display_name: string | null
    first_name: string | null; last_name: string | null
  }[]).map(c => ({
    id:   c.id,
    name: c.display_name
       ?? [c.last_name, c.first_name].filter(Boolean).join(", ")
       ?? "Unknown",
  }))

  // counselor_id → student_id[]
  const caseloadByCounselor: Record<string, string[]> = {}
  for (const r of caseloadRows) {
    if (!caseloadByCounselor[r.counselor_id]) caseloadByCounselor[r.counselor_id] = []
    caseloadByCounselor[r.counselor_id].push(r.student_id)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between" style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">
            Manage Counselors
          </div>
          <div className="text-white text-[10px] opacity-70">
            {counselors.length} active counselor{counselors.length === 1 ? "" : "s"}
          </div>
        </div>
        <SignOutButton />
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />
      <nav className="px-5 py-2 border-b flex items-center" style={{ borderColor: "#EAEAEA" }}>
        <BackLink fallbackHref="/admin/config" />
      </nav>

      <main className="flex-1 px-5 py-5 max-w-2xl mx-auto w-full flex flex-col gap-3">
        <div className="rounded-xl px-4 py-3 text-[10px]"
             style={{ background: "#FFFBEB", border: "1px solid #FDE68A", color: "#78350F" }}>
          Assign students to counselors&apos; <strong>caseloads</strong>. A student
          can be on more than one counselor&apos;s caseload. Removing here only
          unassigns from the caseload — it doesn&apos;t affect the student&apos;s
          concern flags or other data.
        </div>

        {counselors.length === 0 ? (
          <p className="text-xs text-center py-6" style={{ color: "#999" }}>
            No active counselors. Add counselors in Manage Users → Counselors.
          </p>
        ) : (
          <CounselorCaseloads
            counselors={counselors}
            students={studentRows}
            caseloadByCounselor={caseloadByCounselor}
          />
        )}
      </main>
    </div>
  )
}
