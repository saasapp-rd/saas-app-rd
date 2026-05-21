import { db } from "@/lib/supabase"

/**
 * Server component — renders a compact green banner listing every student
 * with an active check-in. Renders nothing when no active check-ins exist.
 * Never displays location_category (privacy).
 * Shown on every non-student dashboard.
 */
export default async function KnownNotInClassHeader() {
  const now = new Date().toISOString()

  const { data } = await db
    .from("student_check_ins")
    .select("id, student:student_id(first_name, last_name, call_by), staff:staff_id(display_name)")
    .is("released_at", null)
    .gt("expires_at", now)
    .order("claimed_at", { ascending: true })
    .limit(20)

  if (!data || data.length === 0) return null

  function norm(val: unknown): Record<string, string | null> | null {
    if (!val) return null
    return (Array.isArray(val) ? val[0] ?? null : val) as Record<string, string | null> | null
  }

  const items = data.map((row: any) => {
    const stu  = norm(row.student)
    const stf  = norm(row.staff)
    const name = stu ? (stu.call_by ?? stu.first_name ?? "?") : "?"
    return `${name} with ${stf?.display_name ?? "Staff"}`
  })

  return (
    <div className="rounded-xl px-4 py-2.5"
         style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
      <p className="text-[9px] font-bold tracking-[0.2em] uppercase mb-1"
         style={{ color: "#166534", opacity: 0.7 }}>
        ✓ {data.length} student{data.length !== 1 ? "s" : ""} checked in
      </p>
      <p className="text-[10px] leading-relaxed" style={{ color: "#166534" }}>
        {items.join(" · ")}
      </p>
    </div>
  )
}
