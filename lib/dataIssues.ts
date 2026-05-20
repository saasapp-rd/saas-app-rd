import { db } from "@/lib/supabase"

const ACADEMIC_YEAR = "2025-26"

/**
 * Walk every open row in data_issues, re-check whether the underlying
 * problem is still present, and auto-resolve the ones that have been
 * fixed elsewhere (admin edited the course, removed an overlay
 * enrollment, etc.). Returns the count of rows it resolved so the
 * caller can decide whether to surface a banner.
 *
 * Cheap enough to run on every load of /admin/review-queue: at most a
 * handful of bulk lookups, no per-row queries.
 */
export async function autoResolveOpenIssues(): Promise<number> {
  const { data: rows } = await db
    .from("data_issues")
    .select("id, kind, ref_id, ref_type, details")
    .eq("status", "open")
    .range(0, 9999)

  type Row = {
    id:       string
    kind:     string
    ref_id:   string | null
    ref_type: string | null
    details:  Record<string, unknown> | null
  }
  const open = (rows ?? []) as Row[]
  if (open.length === 0) return 0

  const toResolve: string[] = []

  // ── course_needs_review ───────────────────────────────────────────
  // Auto-created placeholder course needs a block_number AND teacher_id.
  // If both are now set (or the course was deleted), the issue is moot.
  const courseIssues = open.filter(r => r.kind === "course_needs_review")
  if (courseIssues.length > 0) {
    const classIds = [...new Set(
      courseIssues
        .map(r => (r.details?.class_id as string | undefined) ?? null)
        .filter((s): s is string => !!s)
    )]
    const courseIds = [...new Set(
      courseIssues.map(r => r.ref_id).filter((s): s is string => !!s)
    )]

    type CourseRow = { id: string; class_id: string | null; block_number: number | null; teacher_id: string | null }
    const courseByClassId = new Map<string, CourseRow>()
    const courseById      = new Map<string, CourseRow>()

    if (classIds.length > 0) {
      const { data } = await db
        .from("courses")
        .select("id, class_id, block_number, teacher_id")
        .in("class_id", classIds)
        .range(0, 9999)
      for (const c of (data ?? []) as CourseRow[]) {
        if (c.class_id) courseByClassId.set(c.class_id, c)
        courseById.set(c.id, c)
      }
    }
    if (courseIds.length > 0) {
      const { data } = await db
        .from("courses")
        .select("id, class_id, block_number, teacher_id")
        .in("id", courseIds)
        .range(0, 9999)
      for (const c of (data ?? []) as CourseRow[]) {
        if (c.class_id) courseByClassId.set(c.class_id, c)
        courseById.set(c.id, c)
      }
    }

    for (const issue of courseIssues) {
      const classId = issue.details?.class_id as string | undefined
      const course  = (classId && courseByClassId.get(classId))
                   || (issue.ref_id && courseById.get(issue.ref_id))
                   || null
      // Course deleted → issue is moot. Course has both fields → fixed.
      if (!course) { toResolve.push(issue.id); continue }
      if (course.block_number !== null && course.teacher_id !== null) {
        toResolve.push(issue.id)
      }
    }
  }

  // ── block_overlay ─────────────────────────────────────────────────
  // Student had 2+ active enrollments in the same block. If they now
  // have ≤ 1 (or the student row is gone), the overlay is resolved.
  const overlayIssues = open.filter(r => r.kind === "block_overlay")
  if (overlayIssues.length > 0) {
    const studentIds = [...new Set(
      overlayIssues
        .map(r => (r.ref_type === "user" ? r.ref_id : null))
        .filter((s): s is string => !!s)
    )]

    type EnrollmentRow = { student_id: string; block_number: number | null }
    const countByKey = new Map<string, number>()

    if (studentIds.length > 0) {
      const { data } = await db
        .from("student_enrollments")
        .select("student_id, block_number")
        .in("student_id", studentIds)
        .eq("academic_year", ACADEMIC_YEAR)
        .range(0, 99999)
      for (const r of (data ?? []) as EnrollmentRow[]) {
        if (r.block_number === null) continue
        const key = `${r.student_id}:${r.block_number}`
        countByKey.set(key, (countByKey.get(key) ?? 0) + 1)
      }
    }

    for (const issue of overlayIssues) {
      const studentId = issue.ref_type === "user" ? issue.ref_id : null
      const block     = typeof issue.details?.block === "number"
                       ? (issue.details.block as number)
                       : null
      if (!studentId || block === null) { toResolve.push(issue.id); continue }
      const key   = `${studentId}:${block}`
      const count = countByKey.get(key) ?? 0
      if (count < 2) toResolve.push(issue.id)
    }
  }

  if (toResolve.length === 0) return 0

  const { error } = await db
    .from("data_issues")
    .update({
      status:      "resolved",
      resolved_at: new Date().toISOString(),
      notes:       "Auto-resolved — underlying data no longer flagged.",
    })
    .in("id", toResolve)

  if (error) {
    console.error("[autoResolveOpenIssues] update failed:", error.message)
    return 0
  }
  return toResolve.length
}
