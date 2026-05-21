import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/supabase"

/**
 * POST /api/admin/backfill-advisors
 *
 * Multi-pass role reconciliation maintenance. (Named for the original
 * use case — the advisor backfill — but now also reconciles teacher /
 * staff based on actual course assignments.) Three passes:
 *
 *   1. Has-class → ensure "teacher"
 *      Every user who's the teacher_id on an active course gets
 *      "teacher" added to their roles[] if not already.
 *
 *   2. Teacher without class → demote to "staff"
 *      Every user tagged "teacher" but NOT a teacher_id on any active
 *      course has "teacher" removed and "staff" added.
 *
 *   3. Advisor backfill (original logic)
 *      Active advisory courses (block 9) whose name contains the
 *      assigned teacher's first or last name → add "advisor" to
 *      that user's roles[].
 *
 * Idempotent. All three passes safe to re-run. Primary `role` column
 * is recomputed from the final roles[] via the priority list.
 *
 * Restricted to admin / super_admin.
 */
const ALLOWED = ["admin", "super_admin"]

const ROLE_HIERARCHY = ["super_admin", "admin", "dean", "coordinator"]
function primaryRole(roles: string[]): string {
  for (const r of ROLE_HIERARCHY) if (roles.includes(r)) return r
  return roles[0] ?? "staff"
}

interface UserRow {
  id:           string
  first_name:   string | null
  last_name:    string | null
  display_name: string | null
  role:         string
  roles:        string[] | null
}

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session || !ALLOWED.includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // ── Step 0: pull the data we need in parallel ─────────────────────
  const [
    { data: activeCoursesRaw, error: courseErr },
    { data: usersRaw,         error: userErr   },
  ] = await Promise.all([
    db.from("courses")
      .select("id, name, block_number, teacher_id, is_active")
      .eq("is_active", true)
      .not("teacher_id", "is", null),
    db.from("users")
      .select("id, first_name, last_name, display_name, role, roles")
      .eq("is_active", true)
      .range(0, 9999),
  ])

  if (courseErr) return NextResponse.json({ error: courseErr.message }, { status: 500 })
  if (userErr)   return NextResponse.json({ error: userErr.message   }, { status: 500 })

  const users = (usersRaw ?? []) as UserRow[]
  const userById = new Map(users.map(u => [u.id, u]))

  // teacher_id → list of active courses (all blocks, not just advisory)
  type CourseLite = { id: string; name: string; block_number: number | null }
  const coursesByTeacher = new Map<string, CourseLite[]>()
  for (const c of activeCoursesRaw ?? []) {
    const tid = c.teacher_id as string
    const list = coursesByTeacher.get(tid) ?? []
    list.push({
      id:           c.id as string,
      name:         c.name as string,
      block_number: c.block_number as number | null,
    })
    coursesByTeacher.set(tid, list)
  }

  // Build a mutable working copy of each user's roles. We'll mutate in
  // memory across all three passes, then diff vs the original at the end
  // and write only what changed.
  const working = new Map<string, string[]>()
  for (const u of users) {
    working.set(u.id, [...(u.roles ?? [u.role])])
  }

  // ── Pass 1: has-class → ensure "teacher" ──────────────────────────
  let pass1Added = 0
  for (const teacherId of coursesByTeacher.keys()) {
    const roles = working.get(teacherId)
    if (!roles) continue                           // teacher row inactive
    if (roles.includes("teacher")) continue
    roles.push("teacher")
    pass1Added++
  }

  // ── Pass 2: teacher without class → demote to "staff" ─────────────
  let pass2Demoted = 0
  for (const [uid, roles] of working) {
    if (!roles.includes("teacher")) continue
    if (coursesByTeacher.has(uid))   continue      // teaches something
    // Strip teacher, ensure staff is present.
    const next = roles.filter(r => r !== "teacher")
    if (!next.includes("staff")) next.push("staff")
    working.set(uid, next)
    pass2Demoted++
  }

  // ── Pass 3: advisor backfill on block-9 name match ────────────────
  let pass3Added = 0
  for (const [teacherId, courses] of coursesByTeacher) {
    const u = userById.get(teacherId)
    if (!u) continue
    const advisoryCourses = courses.filter(c => c.block_number === 9)
    if (advisoryCourses.length === 0) continue

    const tokens = [u.first_name, u.last_name]
      .filter((s): s is string => !!s && s.trim().length >= 2)
      .map(s => s.toLowerCase())
    if (tokens.length === 0) continue

    const nameMatch = advisoryCourses.some(c => {
      const n = c.name.toLowerCase()
      return tokens.some(tok => n.includes(tok))
    })
    if (!nameMatch) continue

    const roles = working.get(teacherId)!
    if (roles.includes("advisor")) continue
    roles.push("advisor")
    pass3Added++
  }

  // ── Diff and persist ──────────────────────────────────────────────
  let updates = 0
  for (const u of users) {
    const before = [...(u.roles ?? [u.role])].sort()
    const after  = [...(working.get(u.id) ?? [])].sort()
    if (JSON.stringify(before) === JSON.stringify(after)) continue

    const newPrimary = primaryRole(after)
    const { error } = await db
      .from("users")
      .update({ roles: after, role: newPrimary })
      .eq("id", u.id)
    if (error) {
      return NextResponse.json({
        error: error.message, partial: { updates, pass1Added, pass2Demoted, pass3Added },
      }, { status: 500 })
    }
    updates++
  }

  return NextResponse.json({
    ok: true,
    updates,
    pass1Added,
    pass2Demoted,
    pass3Added,
    message:
      `Reconciled ${updates} user${updates === 1 ? "" : "s"}: ` +
      `${pass1Added} gained "teacher" (has a class), ` +
      `${pass2Demoted} demoted to "staff" (no class), ` +
      `${pass3Added} gained "advisor" (name-matched block 9).`,
  })
}
