import { NextRequest, NextResponse }        from "next/server"
import { getServerSession }                  from "next-auth"
import { authOptions }                       from "@/lib/auth"
import { db }                                from "@/lib/supabase"
import { getCurrentPeriod }                  from "@/lib/schedule"
import { todayPacific, periodEndToUTC }      from "@/lib/time"
import { sendPushToRole }                    from "@/lib/push"

const ALL_CATEGORIES = [
  "classroom","library","advisory","study_hall","gym","hallway","office_misc",
  "accommodations","nurse","counselor_office","other_sensitive",
]
const SENSITIVE_CATEGORIES = ["accommodations","nurse","counselor_office","other_sensitive"]
const SENSITIVE_ROLE_MAP: Record<string, string[]> = {
  accommodations:   ["accommodations","coordinator","dean","admin","super_admin"],
  nurse:            ["nurse","coordinator","dean","admin","super_admin"],
  counselor_office: ["counselor","coordinator","dean","admin","super_admin"],
  other_sensitive:  ["counselor","nurse","accommodations","coordinator","dean","admin","super_admin"],
}
const NON_STUDENT_ROLES = [
  "teacher","advisor","staff","counselor","nurse","accommodations",
  "coordinator","dean","admin","super_admin",
]
const PRIVILEGED_ROLES = ["coordinator","dean","admin","super_admin"]

// ── GET — active list (for header) or per-student history ────────────────────
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !NON_STUDENT_ROLES.includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const active    = searchParams.get("active") === "true"
  const studentId = searchParams.get("student_id")
  const role      = session.user.role

  if (active) {
    const now = new Date().toISOString()
    const { data, error } = await db
      .from("student_check_ins")
      .select("id, staff_id, claimed_at, student:student_id(first_name, last_name, call_by), staff:staff_id(display_name)")
      .is("released_at", null)
      .gt("expires_at", now)
      .order("claimed_at", { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Never expose location_category in this surface
    return NextResponse.json((data ?? []).map((row: any) => {
      const stu = Array.isArray(row.student) ? row.student[0] : row.student
      const stf = Array.isArray(row.staff)   ? row.staff[0]   : row.staff
      return {
        id:           row.id,
        staff_id:     row.staff_id,
        claimed_at:   row.claimed_at,
        student_name: stu
          ? `${stu.call_by ?? stu.first_name ?? ""} ${stu.last_name ?? ""}`.trim()
          : "Unknown",
        staff_name: stf?.display_name ?? "Staff",
      }
    }))
  }

  if (studentId) {
    // Per-student history — role-aware projection: sensitive rows absent for non-privileged
    const { data, error } = await db
      .from("student_check_ins")
      .select("id, staff_id, location_category, block_number, claimed_at, expires_at, released_at, released_reason, notes, staff:staff_id(display_name)")
      .eq("student_id", studentId)
      .order("claimed_at", { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const canSeeAll = PRIVILEGED_ROLES.includes(role)
    const filtered = (data ?? []).filter((row: any) => {
      if (!SENSITIVE_CATEGORIES.includes(row.location_category)) return true
      if (canSeeAll) return true
      if (role === "counselor"      && row.location_category === "counselor_office") return true
      if (role === "nurse"          && row.location_category === "nurse")             return true
      if (role === "accommodations" && row.location_category === "accommodations")    return true
      return false
    })
    return NextResponse.json(filtered)
  }

  return NextResponse.json({ error: "active=true or student_id= required" }, { status: 400 })
}

// ── POST — create a check-in ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !NON_STUDENT_ROLES.includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { student_id, location_category, expires_at, notes } = body

  if (!student_id || !location_category)
    return NextResponse.json({ error: "student_id and location_category required" }, { status: 400 })

  if (!ALL_CATEGORIES.includes(location_category))
    return NextResponse.json({ error: "Invalid location_category" }, { status: 400 })

  // Server-side sensitive category enforcement
  if (SENSITIVE_CATEGORIES.includes(location_category)) {
    const allowed = SENSITIVE_ROLE_MAP[location_category] ?? []
    if (!allowed.includes(session.user.role))
      return NextResponse.json({ error: "Your role cannot create this category of check-in" }, { status: 403 })
  }

  const period = await getCurrentPeriod()
  if (period.type === "outside_school")
    return NextResponse.json({ error: "Check-ins cannot be created outside school hours" }, { status: 400 })

  // Compute expires_at if not provided by client (client sends it for "next block" choice)
  let finalExpiresAt: string
  if (expires_at) {
    finalExpiresAt = expires_at
  } else if (period.periodEnd) {
    const today = todayPacific()
    const periodEndISO = periodEndToUTC(today, period.periodEnd)
    // 15-minute floor: if < 15 min left in period, use 15 min from now instead
    const floor = new Date(Date.now() + 15 * 60 * 1000).toISOString()
    finalExpiresAt = periodEndISO > floor ? periodEndISO : floor
  } else {
    // Lunch or community — 45-minute default
    finalExpiresAt = new Date(Date.now() + 45 * 60 * 1000).toISOString()
  }

  const now = new Date().toISOString()

  // Find any existing active check-in to supersede
  const { data: existing } = await db
    .from("student_check_ins")
    .select("id, staff:staff_id(display_name)")
    .eq("student_id", student_id)
    .is("released_at", null)
    .gt("expires_at", now)
    .limit(1)

  // Insert new check-in
  const { data: newRow, error: insertErr } = await db
    .from("student_check_ins")
    .insert({
      student_id,
      staff_id:          session.user.userId,
      location_category,
      block_number:      period.type === "block" ? period.blockNumber : null,
      claimed_at:        now,
      expires_at:        finalExpiresAt,
      notes:             notes ?? null,
    })
    .select()
    .single()
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  // Supersede prior check-in — close it and record handoff
  if (existing && existing.length > 0) {
    await db.from("student_check_ins").update({
      released_at:     now,
      released_reason: "superseded",
      superseded_by:   newRow.id,
    }).eq("id", existing[0].id)

    // Notify coordinator of the supersede
    const prevStaff = Array.isArray(existing[0].staff) ? existing[0].staff[0] : existing[0].staff
    const prevName  = (prevStaff as any)?.display_name ?? "Staff"
    sendPushToRole("coordinator", {
      title: "Check-in superseded",
      body:  `${session.user.displayName} has taken over from ${prevName}`,
      url:   "/coordinator",
    }).catch(() => {})
  }

  return NextResponse.json(newRow, { status: 201 })
}
