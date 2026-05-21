import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/supabase"

/**
 * POST /api/admin/backfill-advisors
 *
 * One-shot maintenance: every user who teaches an active advisory
 * course (block_number = 9) and whose first/last name appears in the
 * course name picks up the "advisor" role. Idempotent — re-running
 * adds nothing if everything's already in place.
 *
 * Restricted to admin / super_admin.
 */
const ALLOWED = ["admin", "super_admin"]

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session || !ALLOWED.includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // 1. Find every active advisory course with a teacher assigned.
  const { data: advisoryCourses, error: courseErr } = await db
    .from("courses")
    .select("id, name, teacher_id")
    .eq("block_number", 9)
    .eq("is_active", true)
    .not("teacher_id", "is", null)

  if (courseErr) return NextResponse.json({ error: courseErr.message }, { status: 500 })

  // Group courses by teacher so we make at most one update per user.
  const coursesByTeacher = new Map<string, { id: string; name: string }[]>()
  for (const c of advisoryCourses ?? []) {
    const tid = c.teacher_id as string
    const list = coursesByTeacher.get(tid) ?? []
    list.push({ id: c.id as string, name: c.name as string })
    coursesByTeacher.set(tid, list)
  }

  if (coursesByTeacher.size === 0) {
    return NextResponse.json({
      scanned: 0, matched: 0, added: 0, alreadyHad: 0,
      message: "No advisory courses with assigned teachers found.",
    })
  }

  // 2. Hydrate teacher names.
  const teacherIds = [...coursesByTeacher.keys()]
  const { data: teacherRows } = await db
    .from("users")
    .select("id, first_name, last_name, display_name, role, roles")
    .in("id", teacherIds)

  type Teacher = {
    id: string; first_name: string | null; last_name: string | null
    display_name: string | null; role: string; roles: string[] | null
  }
  const teachers = (teacherRows ?? []) as Teacher[]

  // 3. For each teacher, check whether any of their advisory courses
  //    matches their name. If yes and they're not already an advisor,
  //    add the role.
  const updates: Array<{ id: string; roles: string[] }> = []
  let matched = 0, alreadyHad = 0, added = 0

  for (const t of teachers) {
    const courses = coursesByTeacher.get(t.id) ?? []
    const tokens  = [t.first_name, t.last_name]
      .filter((s): s is string => !!s && s.trim().length >= 2)
      .map(s => s.toLowerCase())
    if (tokens.length === 0) continue

    const nameMatch = courses.some(c => {
      const n = c.name.toLowerCase()
      return tokens.some(tok => n.includes(tok))
    })
    if (!nameMatch) continue

    matched++

    const current = t.roles ?? [t.role]
    if (current.includes("advisor")) {
      alreadyHad++
      continue
    }
    const next = [...current, "advisor"]
    updates.push({ id: t.id, roles: next })
  }

  // 4. Apply updates one by one (small list — usually <100 teachers).
  for (const u of updates) {
    const { error } = await db
      .from("users")
      .update({ roles: u.roles })
      .eq("id", u.id)
    if (error) {
      return NextResponse.json({
        scanned: coursesByTeacher.size, matched, added,
        alreadyHad, error: error.message,
      }, { status: 500 })
    }
    added++
  }

  return NextResponse.json({
    scanned:    coursesByTeacher.size,
    matched,
    added,
    alreadyHad,
    message: `Reviewed ${coursesByTeacher.size} teachers · matched ${matched} by name · added "advisor" to ${added} (${alreadyHad} already had it).`,
  })
}
