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

/** Short badge label: block 9 = "ADV", others = "B1"…"B8" */
function blockBadge(n: number | null) {
  if (n === null)      return "?"
  if (n === 9)         return "ADV"
  return "B" + n
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
  const [enrollments, setEnrollments] = useState(initialEnrollments)
  const [deleting,    setDeleting]    = useState<string | null>(null)
  const [adding,      setAdding]      = useState<string | null>(null)
  const [pickerOpen,  setPickerOpen]  = useState(false)
  const [search,      setSearch]      = useState("")
  const [error,       setError]       = useState("")

  // Count how many courses occupy each block — >1 is a conflict
  const blockCount = new Map<number, number>()
  for (const e of enrollments)
    blockCount.set(e.blockNumber, (blockCount.get(e.blockNumber) ?? 0) + 1)

  const hasConflicts = [...blockCount.values()].some(c => c > 1)

  const enrolledIds = useMemo(
    () => new Set(enrollments.map(e => e.courseId)),
    [enrollments]
  )

  const availableCourses = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allCourses
      .filter(c => !enrolledIds.has(c.courseId))
      .filter(c => {
        if (!q) return true
        return c.courseName.toLowerCase().includes(q)
          || (c.teacherName ?? "").toLowerCase().includes(q)
          || (c.room        ?? "").toLowerCase().includes(q)
      })
      .slice(0, 30)
  }, [allCourses, enrolledIds, search])

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

  async function add(c: CourseOption) {
    setAdding(c.courseId); setError("")
    const res = await fetch("/api/admin/student-enrollments", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ student_id: studentId, course_id: c.courseId }),
    })
    if (res.ok && c.blockNumber !== null) {
      setEnrollments(prev => [
        ...prev,
        {
          courseId:    c.courseId,
          blockNumber: c.blockNumber as number,
          courseName:  c.courseName,
          room:        c.room,
          teacherId:   c.teacherId,
          teacherName: c.teacherName,
        },
      ].sort((a, b) => a.blockNumber - b.blockNumber))
    } else if (!res.ok) {
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

      {enrollments.length === 0 ? (
        <p className="text-xs text-center py-3" style={{ color: "#999" }}>
          No schedule on file.{canEdit ? " Add a class below or import via CSV." : " Import a class schedule via CSV."}
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {enrollments.map(e => {
            const conflict = (blockCount.get(e.blockNumber) ?? 0) > 1
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
          })}
        </div>
      )}

      {/* Add a class */}
      {canEdit && (
        <div className="rounded-xl border mt-1 overflow-hidden"
             style={{ borderColor: "#EAEAEA" }}>
          <button onClick={() => { setPickerOpen(o => !o); if (pickerOpen) setSearch("") }}
            className="w-full px-4 py-2.5 flex items-center justify-between"
            style={{ background: pickerOpen ? "#FFF8F8" : "#FAFAFA", border: "none", cursor: "pointer" }}>
            <p className="text-[10px] font-bold uppercase tracking-wider"
               style={{ color: pickerOpen ? "#A6192E" : "#3D3D3D", opacity: pickerOpen ? 1 : 0.5 }}>
              + Add a class
            </p>
            <span className="text-xs" style={{ color: pickerOpen ? "#A6192E" : "#BABABA" }}>
              {pickerOpen ? "▲" : "▼"}
            </span>
          </button>

          {pickerOpen && (
            <div className="px-4 py-3 border-t flex flex-col gap-2"
                 style={{ borderColor: "#EAEAEA", background: "#fff" }}>
              <input
                type="search"
                placeholder="Search courses by name, teacher, or room…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                style={{ borderColor: "#EAEAEA", background: "#FAFAFA", color: "#3D3D3D" }}
                autoFocus
              />
              <p className="text-[10px]" style={{ color: "#999" }}>
                Overlays are allowed — pick any course, even if its block is already filled.
              </p>
              {availableCourses.length === 0 ? (
                <p className="text-xs text-center py-3" style={{ color: "#999" }}>
                  {search ? `No matching courses.` : "All active courses already enrolled."}
                </p>
              ) : (
                <div className="flex flex-col gap-1 max-h-96 overflow-y-auto">
                  {availableCourses.map(c => {
                    const isBusy = adding === c.courseId
                    const blockHasOverlap = c.blockNumber !== null && (blockCount.get(c.blockNumber) ?? 0) > 0
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
