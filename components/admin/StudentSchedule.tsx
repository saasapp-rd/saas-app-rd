"use client"
import { useState } from "react"
import Link from "next/link"

interface Enrollment {
  courseId:    string
  blockNumber: number
  courseName:  string
  room:        string | null
  teacherId:   string | null
  teacherName: string | null
}

/** Short badge label: block 9 = "ADV", others = "B1"…"B8" */
function blockBadge(n: number) { return n === 9 ? "ADV" : "B" + n }

export default function StudentSchedule({
  studentId,
  initialEnrollments,
}: {
  studentId:           string
  initialEnrollments:  Enrollment[]
}) {
  const [enrollments, setEnrollments] = useState(initialEnrollments)
  const [deleting,    setDeleting]    = useState<string | null>(null)
  const [error,       setError]       = useState("")

  // Count how many courses occupy each block — >1 is a conflict
  const blockCount = new Map<number, number>()
  for (const e of enrollments)
    blockCount.set(e.blockNumber, (blockCount.get(e.blockNumber) ?? 0) + 1)

  const hasConflicts = [...blockCount.values()].some(c => c > 1)

  async function remove(courseId: string) {
    setDeleting(courseId)
    setError("")
    const res  = await fetch("/api/admin/student-enrollments", {
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

  if (enrollments.length === 0) {
    return (
      <p className="text-xs text-center py-3" style={{ color: "#999" }}>
        No schedule on file. Import a class schedule via CSV.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">

      {/* Conflict banner */}
      {hasConflicts && (
        <div className="rounded-xl px-4 py-2.5"
             style={{ background: "#FFF8E0", border: "1px solid #FDE68A" }}>
          <p className="text-[10px] font-bold" style={{ color: "#92400E" }}>
            ⚠ Schedule conflict — multiple classes in the same block.
            Remove the incorrect one below.
          </p>
        </div>
      )}

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

              {/* Block badge */}
              <span className="w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0"
                    style={{
                      background: conflict ? "#FFE0E0" : "#EAEAEA",
                      color:      conflict ? "#CE2033" : "#3D3D3D",
                    }}>
                {blockBadge(e.blockNumber)}
              </span>

              {/* Course + teacher */}
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

              {/* Remove button */}
              <button
                onClick={() => remove(e.courseId)}
                disabled={deleting === e.courseId}
                className="text-[10px] font-bold px-2.5 py-1 rounded-lg flex-shrink-0"
                style={{
                  background: "#FFF0F0", color: "#CE2033",
                  border: "1px solid #FECACA", cursor: "pointer",
                  opacity: deleting === e.courseId ? 0.5 : 1,
                }}>
                {deleting === e.courseId ? "…" : "Remove"}
              </button>
            </div>
          )
        })}
      </div>

      {error && (
        <p className="text-[10px] font-semibold text-center" style={{ color: "#CE2033" }}>{error}</p>
      )}
    </div>
  )
}
