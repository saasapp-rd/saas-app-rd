"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export interface EnrollmentRow {
  id:           string
  course_id:    string
  block_number: number
  course: {
    id:          string
    name:        string
    room:        string | null
    is_advisory: boolean
    teacher:     { display_name: string | null } | null
  } | null
}

export interface CourseOption {
  id:          string
  name:        string
  block_number: number
  room:        string | null
  is_advisory: boolean
  teacher:     { display_name: string | null } | null
}

const BLOCKS = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const BLOCK_LABEL: Record<number, string> = {
  1: "Block 1", 2: "Block 2", 3: "Block 3", 4: "Block 4",
  5: "Block 5", 6: "Block 6", 7: "Block 7", 8: "Block 8",
  9: "Advisory",
}

export default function StudentSchedule({
  studentId,
  enrollments: initial,
  allCourses,
  canEdit,
}: {
  studentId:   string
  enrollments: EnrollmentRow[]
  allCourses:  CourseOption[]
  canEdit:     boolean
}) {
  const router = useRouter()
  const [expandedBlock,   setExpandedBlock]   = useState<number | null>(null)
  const [selectedCourse,  setSelectedCourse]  = useState("")
  const [saving,          setSaving]          = useState(false)
  const [removingId,      setRemovingId]      = useState<string | null>(null)
  const [error,           setError]           = useState("")

  // index enrollments by block
  const byBlock: Record<number, EnrollmentRow> = {}
  for (const e of initial) byBlock[e.block_number] = e

  // index courses by block
  const coursesByBlock: Record<number, CourseOption[]> = {}
  for (const c of allCourses) {
    if (!coursesByBlock[c.block_number]) coursesByBlock[c.block_number] = []
    coursesByBlock[c.block_number].push(c)
  }

  function openBlock(block: number) {
    setExpandedBlock(block)
    setSelectedCourse("")
    setError("")
  }

  async function enroll() {
    if (!selectedCourse || expandedBlock === null) return
    setSaving(true); setError("")
    const res = await fetch("/api/admin/enrollment", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ student_id: studentId, course_id: selectedCourse }),
    })
    if (res.ok) {
      setExpandedBlock(null)
      setSelectedCourse("")
      router.refresh()
    } else {
      const d = await res.json()
      setError(d.error ?? "Failed to enroll.")
    }
    setSaving(false)
  }

  async function removeEnrollment(enrollmentId: string) {
    setRemovingId(enrollmentId); setError("")
    const res = await fetch("/api/admin/enrollment", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ enrollment_id: enrollmentId }),
    })
    if (res.ok) { router.refresh() }
    else { const d = await res.json(); setError(d.error ?? "Failed to remove.") }
    setRemovingId(null)
  }

  return (
    <div className="flex flex-col gap-1.5">
      {BLOCKS.map(block => {
        const current    = byBlock[block]
        const options    = coursesByBlock[block] ?? []
        const isExpanded = expandedBlock === block
        const isAdvisory = block === 9
        const willReplace = isExpanded && !!current && !!selectedCourse && selectedCourse !== current.course_id

        return (
          <div key={block} className="rounded-xl border overflow-hidden"
               style={{ borderColor: isExpanded ? "#A6192E" : "#EAEAEA" }}>

            {/* Block row */}
            <div className="px-3 py-2.5 flex items-center gap-2.5"
                 style={{ background: isExpanded ? "#FFF8F8" : current ? "#FAFAFA" : "#F7F7F7" }}>

              {/* Block label */}
              <span className="text-[9px] font-black w-14 flex-shrink-0 uppercase tracking-wide"
                    style={{ color: isAdvisory ? "#1E5FA6" : "#A6192E" }}>
                {BLOCK_LABEL[block]}
              </span>

              {/* Course info or empty */}
              <div className="flex-1 min-w-0">
                {current ? (
                  <>
                    <p className="text-sm font-semibold truncate" style={{ color: "#3D3D3D" }}>
                      {current.course?.name ?? "Unknown course"}
                    </p>
                    <p className="text-[10px] truncate" style={{ color: "#999" }}>
                      {current.course?.teacher?.display_name ?? "No teacher"}
                      {current.course?.room ? ` · ${current.course.room}` : ""}
                    </p>
                  </>
                ) : (
                  <p className="text-sm" style={{ color: "#BABABA" }}>—</p>
                )}
              </div>

              {/* Admin controls */}
              {canEdit && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {current && !isExpanded && (
                    <button
                      onClick={() => removeEnrollment(current.id)}
                      disabled={removingId === current.id}
                      className="text-[9px] font-bold w-6 h-6 rounded-lg flex items-center justify-center"
                      style={{ background: "#FEE2E2", color: "#CE2033", border: "none", cursor: "pointer",
                               opacity: removingId === current.id ? 0.5 : 1 }}>
                      {removingId === current.id ? "…" : "×"}
                    </button>
                  )}
                  {options.length > 0 && (
                    <button
                      onClick={() => isExpanded ? setExpandedBlock(null) : openBlock(block)}
                      className="text-[9px] font-bold px-2.5 py-1 rounded-lg"
                      style={{
                        background: isExpanded ? "#A6192E" : "#EAEAEA",
                        color:      isExpanded ? "#fff"    : "#3D3D3D",
                        border: "none", cursor: "pointer",
                      }}>
                      {isExpanded ? "✕" : current ? "Change" : "+ Add"}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Picker panel */}
            {isExpanded && (
              <div className="px-3 py-3 border-t flex flex-col gap-2"
                   style={{ background: "#fff", borderColor: "#EAEAEA" }}>

                {/* Conflict warning */}
                {willReplace && (
                  <div className="rounded-lg px-3 py-2"
                       style={{ background: "#FFF8E0", border: "1px solid #FDE68A" }}>
                    <p className="text-[10px] font-semibold" style={{ color: "#92400E" }}>
                      ⚠ Currently enrolled in <strong>{current.course?.name}</strong> — this will replace it.
                    </p>
                  </div>
                )}

                {/* Course options */}
                <div className="flex flex-col gap-1 max-h-52 overflow-y-auto">
                  {options.map(c => {
                    const selected = selectedCourse === c.id
                    return (
                      <button key={c.id} type="button"
                        onClick={() => setSelectedCourse(c.id)}
                        className="text-left px-3 py-2 rounded-xl"
                        style={{
                          background: selected ? "#FFF0F0" : "#FAFAFA",
                          border:     `1.5px solid ${selected ? "#A6192E" : "#EAEAEA"}`,
                          cursor: "pointer",
                        }}>
                        <p className="text-xs font-semibold" style={{ color: "#3D3D3D" }}>{c.name}</p>
                        <p className="text-[10px]" style={{ color: "#999" }}>
                          {c.teacher?.display_name ?? "No teacher"}
                          {c.room ? ` · ${c.room}` : ""}
                        </p>
                      </button>
                    )
                  })}
                </div>

                {error && (
                  <p className="text-[10px] font-semibold" style={{ color: "#CE2033" }}>{error}</p>
                )}

                <button onClick={enroll}
                  disabled={!selectedCourse || saving}
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white"
                  style={{
                    background: "#A6192E",
                    opacity: !selectedCourse || saving ? 0.4 : 1,
                    border: "none", cursor: !selectedCourse ? "default" : "pointer",
                  }}>
                  {saving ? "Saving…" : willReplace ? "Replace Enrollment" : "Enroll in Course"}
                </button>
              </div>
            )}
          </div>
        )
      })}

      {error && !expandedBlock && (
        <p className="text-xs font-semibold text-center" style={{ color: "#CE2033" }}>{error}</p>
      )}
    </div>
  )
}
