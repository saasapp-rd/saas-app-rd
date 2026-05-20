// Pure schedule analysis — no React, no client-only imports — so server
// components (e.g. /students/[id]) and client components alike can call
// it without crossing the "use client" boundary.

export interface EnrollmentRow {
  block:        number | null   // null = placeholder course, block not assigned yet
  courseName:   string
  room:         string | null
  teacherName:  string | null
  isAdvisory:   boolean
}

export interface ScheduleStatus {
  hasIssues:       boolean
  missingBlocks:   number[]   // any of 1-8 with no enrollment
  missingAdvisory: boolean    // no block 9 enrollment
  overlays:        number[]   // blocks with > 1 enrollment
}

export function analyzeSchedule(enrollments: EnrollmentRow[]): ScheduleStatus {
  // Null-block enrollments (placeholder courses) don't count toward
  // overlay / missing detection — we genuinely don't know what block
  // they belong in until admin assigns one.
  const counts = new Map<number, number>()
  for (const e of enrollments) {
    if (e.block != null) counts.set(e.block, (counts.get(e.block) ?? 0) + 1)
  }
  const missingBlocks   = [1,2,3,4,5,6,7,8].filter(b => !counts.has(b))
  const missingAdvisory = !counts.has(9)
  const overlays        = [...counts.entries()]
    .filter(([, c]) => c > 1)
    .map(([b]) => b)
    .sort((a, b) => a - b)
  return {
    hasIssues: missingBlocks.length > 0 || missingAdvisory || overlays.length > 0,
    missingBlocks,
    missingAdvisory,
    overlays,
  }
}
