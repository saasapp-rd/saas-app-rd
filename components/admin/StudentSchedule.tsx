"use client"
import { useState, useMemo } from "react"
import Link from "next/link"

interface Enrollment {
  courseId:    string
  blockNumber: number
  courseName:  string
  room:        string | null
  teacherId:   string | null
  teacherName: string | null
}

export interface CourseOption {
  courseId:    string
  blockNumber: number | null
  courseName:  string
  room:        string | null
  teacherId:   string | null
  teacherName: string | null
}

const ALL_BLOCKS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

/** Short badge label: block 9 = "ADV", others = "B1"…"B8" */
function blockBadge(n: number | null) {
  if (n === null)      return "?"
  if (n === 9)         return "ADV"
  return "B" + n
}

function blockLabel(n: number) {
  return n === 9 ? "Advisory" : `Block ${n}`
}

export default function StudentSchedule({
  studentId,
  initialEnrollments,
  allCourses = [],
  canEdit = false,
}: {
  studentId:           string
  initialEnrollments:  Enrollment[]
  allCourses?:         CourseOption[]
  canEdit?:            boolean
}) {
  const [enrollments,     setEnrollments]     = useState(initialEnrollments)
  const [deleting,        setDeleting]        = useState<string | null>(null)
  const [adding,          setAdding]          = useState<string | null>(null)
  const [pickerForBlock,  setPickerForBlock]  = useState<number | null>(null)
  const [generalOpen,     setGeneralOpen]     = useState(false)
  const [generalSearch,   setGeneralSearch]   = useState("")
  const [error,           setError]           = useState("")

  // Bucket enrollments by block
  const rowsByBlock = useMemo(() => {
    const m = new Map<number, Enrollment[]>()
    for (const e of enrollments) {
      const list = m.get(e.blockNumber) ?? []
      list.push(e)
      m.set(e.blockNumber, list)
    }
    return m
  }, [enrollments])

  const hasConflicts = useMemo(
    () => [...rowsByBlock.values()].some(rs => rs.length > 1),
    [rowsByBlock]
  )

  const enrolledIds = useMemo(
    () => new Set(enrollments.map(e => e.courseId)),
    [enrollments]
  )

  function coursesForBlock(b: number): CourseOption[] {
    // Include placeholders (block_number === null) so Options / Directed
    // Study / other un-blocked courses can be slotted into the block
    // the admin clicked. The enrollment row carries its own block_number,
    // so the same placeholder course can serve different blocks for
    // different students.
    return allCourses
      .filter(c => (c.blockNumber === b || c.blockNumber === null) && !enrolledIds.has(c.courseId))
      .sort((a, b) => {
        // Real-block matches first, placeholders last
        const aPlaceholder = a.blockNumber === null ? 1 : 0
        const bPlaceholder = b.blockNumber === null ? 1 : 0
        if (aPlaceholder !== bPlaceholder) return aPlaceholder - bPlaceholder
        return a.courseName.localeCompare(b.courseName)
      })
  }

  // General picker — overlays + placeholder courses.
  // No truncation: scroll handles whatever the search returns.
  const generalResults = useMemo(() => {
    const q = generalSearch.trim().toLowerCase()
    return allCourses
      .filter(c => !enrolledIds.has(c.courseId))
      .filter(c => {
        if (!q) return true
        return c.courseName.toLowerCase().includes(q)
          || (c.teacherName ?? "").toLowerCase().includes(q)
          || (c.room        ?? "").toLowerCase().includes(q)
      })
      .sort((a, b) => {
        // Real-block matches first, placeholders last, then alphabetical
        const aPh = a.blockNumber === null ? 1 : 0
        const bPh = b.blockNumber === null ? 1 : 0
        if (aPh !== bPh) return aPh - bPh
        const aBlock = a.blockNumber ?? 99
        const bBlock = b.blockNumber ?? 99
        if (aBlock !== bBlock) return aBlock - bBlock
        return a.courseName.localeCompare(b.courseName)
      })
  }, [allCourses, enrolledIds, generalSearch])

  async function remove(courseId: string) {
    setDeleting(courseId); setError("")
    const res = await fetch("/api/admin/student-enrollments", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ student_id: studentId, course_id: courseId }),
    })
    if (res.ok) {
      setEnrollments(prev => prev.filter(e => e.courseId !== courseId))
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? "Failed to remove enrollment.")
    }
    setDeleting(null)
  }

  async function add(c: CourseOption, blockOverride?: number) {
    setAdding(c.courseId); setError("")
    const body: Record<string, unknown> = {
      student_id: studentId,
      course_id:  c.courseId,
    }
    if (blockOverride !== undefined) body.block_number = blockOverride

    const res = await fetch("/api/admin/student-enrollments", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    })
    if (res.ok) {
      const effectiveBlock = blockOverride ?? c.blockNumber
      if (effectiveBlock !== null) {
        setEnrollments(prev => [
          ...prev,
          {
            courseId:    c.courseId,
            blockNumber: effectiveBlock,
            courseName:  c.courseName,
            room:        c.room,
            teacherId:   c.teacherId,
            teacherName: c.teacherName,
          },
        ].sort((a, b) => a.blockNumber - b.blockNumber))
      }
      setPickerForBlock(null)
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? "Failed to add enrollment.")
    }
    setAdding(null)
  }

  return (
    <div className="flex flex-col gap-2">

      {/* Conflict banner */}
      {hasConflicts && (
        <div className="rounded-xl px-4 py-2.5"
             style={{ background: "#FFF8E0", border: "1px solid #FDE68A" }}>
          <p className="text-[10px] font-bold" style={{ color: "#92400E" }}>
            ⚠ Schedule conflict — multiple classes in the same block.
            Remove the incorrect one below, or keep both if intentional (e.g. options overlay).
          </p>
        </div>
      )}

      {/* Schedule — fixed 9-block grid */}
      <div className="flex flex-col gap-1.5">
        {ALL_BLOCKS.flatMap(block => {
          const rows = rowsByBlock.get(block) ?? []

          if (rows.length === 0) {
            const isPickerOpen = pickerForBlock === block
            const blockCourses = coursesForBlock(block)
            return [(
              <div key={`empty-${block}`} className="rounded-xl border overflow-hidden"
                   style={{ borderColor: "#EAEAEA" }}>
                <div className="px-4 py-3 flex items-center gap-3"
                     style={{ background: "#FAFAFA" }}>
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0"
                        style={{ background: "#EAEAEA", color: "#BABABA" }}>
                    {blockBadge(block)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: "#999" }}>
                      No class
                    </p>
                    <p className="text-[10px]" style={{ color: "#BABABA" }}>
                      {blockLabel(block)}
                    </p>
                  </div>
                  {canEdit && (
                    <button onClick={() => setPickerForBlock(isPickerOpen ? null : block)}
                            className="text-[10px] font-bold px-2.5 py-1 rounded-lg flex-shrink-0"
                            style={{
                              background: isPickerOpen ? "#A6192E" : "#EEF6FF",
                              color:      isPickerOpen ? "#fff"    : "#1E5FA6",
                              border: "none", cursor: "pointer",
                            }}>
                      {isPickerOpen ? "Cancel" : "+ Add class"}
                    </button>
                  )}
                </div>

                {isPickerOpen && (
                  <div className="px-4 py-3 border-t flex flex-col gap-2"
                       style={{ background: "#fff", borderColor: "#EAEAEA" }}>
                    {blockCourses.length === 0 ? (
                      <p className="text-xs py-2 text-center" style={{ color: "#999" }}>
                        No active courses available for {blockLabel(block).toLowerCase()}.
                      </p>
                    ) : (
                      <>
                        <p className="text-[10px] font-bold uppercase tracking-wider"
                           style={{ color: "#999" }}>
                          {blockCourses.length} option{blockCourses.length === 1 ? "" : "s"} · scroll to browse
                        </p>
                        <div className="flex flex-col gap-1 overflow-y-auto rounded-lg"
                             style={{ maxHeight: "60vh", border: "1px solid #EAEAEA" }}>
                        {blockCourses.map(c => {
                          const isBusy      = adding === c.courseId
                          const isPlaceholder = c.blockNumber === null
                          return (
                            <button key={c.courseId} onClick={() => add(c, block)} disabled={isBusy}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg text-left"
                              style={{
                                background: isPlaceholder ? "#FFFBEB" : "#FAFAFA",
                                border:     `1px solid ${isPlaceholder ? "#FDE68A" : "#EAEAEA"}`,
                                cursor: "pointer", opacity: isBusy ? 0.5 : 1,
                              }}>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-xs font-semibold truncate" style={{ color: "#3D3D3D" }}>
                                    {c.courseName}
                                  </p>
                                  {isPlaceholder && (
                                    <span className="text-[8px] font-bold px-1 py-0.5 rounded uppercase flex-shrink-0"
                                          style={{ background: "#FDE68A", color: "#78350F" }}>
                                      Options / Unblocked
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] truncate" style={{ color: "#999" }}>
                                  {c.teacherName ?? "No teacher"}
                                  {c.room ? ` · ${c.room}` : ""}
                                  {isPlaceholder && ` · will land in ${blockLabel(block).toLowerCase()}`}
                                </p>
                              </div>
                              <span className="text-[10px] font-bold flex-shrink-0"
                                    style={{ color: "#1E5FA6" }}>
                                {isBusy ? "…" : "+ Add"}
                              </span>
                            </button>
                          )
                        })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )]
          }

          // Filled block — render each enrolled course
          return rows.map(e => {
            const conflict = rows.length > 1
            return (
              <div key={e.courseId}
                   className="rounded-xl px-4 py-3 border flex items-center gap-3"
                   style={{
                     background:  conflict ? "#FFF8F8" : "#FAFAFA",
                     borderColor: conflict ? "#FFCCCC" : "#EAEAEA",
                   }}>
                <span className="w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0"
                      style={{
                        background: conflict ? "#FFE0E0" : "#EAEAEA",
                        color:      conflict ? "#CE2033" : "#3D3D3D",
                      }}>
                  {blockBadge(e.blockNumber)}
                </span>
                <div className="flex-1 min-w-0">
                  <Link href={"/courses/" + e.courseId} style={{ textDecoration: "none" }}>
                    <p className="text-sm font-semibold truncate" style={{ color: "#A6192E" }}>
                      {e.courseName}
                      <span className="ml-1 text-[9px]">&#x2197;</span>
                    </p>
                  </Link>
                  {e.teacherId ? (
                    <Link href={"/teachers/" + e.teacherId} style={{ textDecoration: "none" }}>
                      <p className="text-[10px]" style={{ color: "#999" }}>
                        {e.teacherName ?? "Unknown teacher"} ›
                      </p>
                    </Link>
                  ) : (
                    <p className="text-[10px]" style={{ color: "#BABABA" }}>No teacher assigned</p>
                  )}
                </div>
                {e.room && (
                  <span className="text-[9px] flex-shrink-0" style={{ color: "#BABABA" }}>
                    {e.room}
                  </span>
                )}
                {canEdit && (
                  <button onClick={() => remove(e.courseId)}
                          disabled={deleting === e.courseId}
                          className="text-[10px] font-bold px-2.5 py-1 rounded-lg flex-shrink-0"
                          style={{
                            background: "#FFF0F0", color: "#CE2033",
                            border: "1px solid #FECACA", cursor: "pointer",
                            opacity: deleting === e.courseId ? 0.5 : 1,
                          }}>
                    {deleting === e.courseId ? "…" : "Remove"}
                  </button>
                )}
              </div>
            )
          })
        })}
      </div>

      {/* General add — for overlays + placeholder (no-block) courses */}
      {canEdit && (
        <div className="rounded-xl border mt-1 overflow-hidden"
             style={{ borderColor: "#EAEAEA" }}>
          <button onClick={() => { setGeneralOpen(o => !o); if (generalOpen) setGeneralSearch("") }}
            className="w-full px-4 py-2.5 flex items-center justify-between"
            style={{ background: generalOpen ? "#FFF8F8" : "#FAFAFA", border: "none", cursor: "pointer" }}>
            <p className="text-[10px] font-bold uppercase tracking-wider"
               style={{ color: generalOpen ? "#A6192E" : "#3D3D3D", opacity: generalOpen ? 1 : 0.5 }}>
              + Add another class (overlay or unblocked)
            </p>
            <span className="text-xs" style={{ color: generalOpen ? "#A6192E" : "#BABABA" }}>
              {generalOpen ? "▲" : "▼"}
            </span>
          </button>

          {generalOpen && (
            <div className="px-4 py-3 border-t flex flex-col gap-2"
                 style={{ borderColor: "#EAEAEA", background: "#fff" }}>
              <input
                type="search"
                placeholder="Search courses by name, teacher, or room…"
                value={generalSearch}
                onChange={e => setGeneralSearch(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                style={{ borderColor: "#EAEAEA", background: "#FAFAFA", color: "#3D3D3D" }}
                autoFocus
              />
              <p className="text-[10px]" style={{ color: "#999" }}>
                Use this to add a second class to a block already filled, or to
                attach a placeholder course that hasn&apos;t been given a block yet.
              </p>
              {generalResults.length === 0 ? (
                <p className="text-xs text-center py-3" style={{ color: "#999" }}>
                  {generalSearch ? "No matching courses." : "All active courses already enrolled."}
                </p>
              ) : (
                <>
                  <p className="text-[10px] font-bold uppercase tracking-wider"
                     style={{ color: "#999" }}>
                    {generalResults.length} course{generalResults.length === 1 ? "" : "s"}
                    {!generalSearch && " · scroll to browse"}
                  </p>
                  <div className="flex flex-col gap-1 overflow-y-auto rounded-lg"
                       style={{ maxHeight: "60vh", border: "1px solid #EAEAEA" }}>
                  {generalResults.map(c => {
                    const isBusy = adding === c.courseId
                    const blockHasOverlap = c.blockNumber !== null && (rowsByBlock.get(c.blockNumber)?.length ?? 0) > 0
                    return (
                      <button key={c.courseId} onClick={() => add(c)} disabled={isBusy}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-left"
                        style={{
                          background: "#FAFAFA", border: "1px solid #EAEAEA",
                          cursor: "pointer", opacity: isBusy ? 0.5 : 1,
                        }}>
                        <span className="w-8 h-8 rounded flex items-center justify-center text-[10px] font-black flex-shrink-0"
                              style={{
                                background: c.blockNumber === null ? "#FEE2E2"
                                          : blockHasOverlap         ? "#FFE0E0"
                                          :                           "#EAEAEA",
                                color:      c.blockNumber === null ? "#CE2033"
                                          : blockHasOverlap         ? "#CE2033"
                                          :                           "#3D3D3D",
                              }}>
                          {blockBadge(c.blockNumber)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate" style={{ color: "#3D3D3D" }}>
                            {c.courseName}
                          </p>
                          <p className="text-[10px] truncate" style={{ color: "#999" }}>
                            {c.teacherName ?? "No teacher"}
                            {c.room ? ` · ${c.room}` : ""}
                            {blockHasOverlap ? " · ⚠ block overlap" : ""}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold flex-shrink-0"
                              style={{ color: "#1E5FA6" }}>
                          {isBusy ? "…" : "+ Add"}
                        </span>
                      </button>
                    )
                  })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-[10px] font-semibold text-center" style={{ color: "#CE2033" }}>{error}</p>
      )}
    </div>
  )
}
