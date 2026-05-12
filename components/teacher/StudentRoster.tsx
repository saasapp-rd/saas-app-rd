"use client"
import { useState } from "react"

interface Student { id: string; first_name: string; last_name: string; grade: number }
type Status = "none" | "reported" | "with_me" | "found" | "loading" | "error"

export default function StudentRoster({
  students,
  blockNumber,
  courseId,
  initialStatuses = {},
}: {
  students:        Student[]
  blockNumber:     number
  courseId:        string
  initialStatuses?: Record<string, "reported" | "with_me" | "found">
}) {
  const [statuses, setStatuses] = useState<Record<string, Status>>(initialStatuses)
  const [errors,   setErrors]   = useState<Record<string, string>>({})

  function setStatus(id: string, s: Status) { setStatuses(p => ({ ...p, [id]: s })) }
  function setError(id: string, m: string)  { setErrors(p => ({ ...p, [id]: m })) }

  async function reportMissing(studentId: string) {
    setStatus(studentId, "loading")
    setError(studentId, "")
    try {
      const res  = await fetch("/api/teacher/report", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ student_id: studentId, block_number: blockNumber, course_id: courseId }),
      })
      const data = await res.json()
      if (res.ok) { setStatus(studentId, "reported") }
      else        { setStatus(studentId, "error"); setError(studentId, data.error ?? "Failed to report") }
    } catch {
      setStatus(studentId, "error"); setError(studentId, "Network error — try again")
    }
  }

  async function withMe(studentId: string) {
    setStatus(studentId, "loading")
    setError(studentId, "")
    try {
      const res  = await fetch("/api/teacher/with-me", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ student_id: studentId, block_number: blockNumber, course_id: courseId }),
      })
      const data = await res.json()
      if (res.ok) { setStatus(studentId, "with_me") }
      else        { setStatus(studentId, "error"); setError(studentId, data.error ?? "Failed") }
    } catch {
      setStatus(studentId, "error"); setError(studentId, "Network error — try again")
    }
  }

  const BG: Record<Status, string> = {
    none:     "#FAFAFA",
    reported: "#FFF8F8",
    with_me:  "#F0FDF4",
    found:    "#F0FDF4",
    loading:  "#FAFAFA",
    error:    "#FFF8F8",
  }
  const BORDER: Record<Status, string> = {
    none:     "#EAEAEA",
    reported: "#CE2033",
    with_me:  "#22C55E",
    found:    "#22C55E",
    loading:  "#EAEAEA",
    error:    "#F87171",
  }

  return (
    <div className="flex flex-col gap-1.5">
      {students.map(s => {
        const status    = statuses[s.id] ?? "none"
        const errMsg    = errors[s.id]   ?? ""
        const isLoading = status === "loading"

        return (
          <div key={s.id} className="rounded-xl px-4 py-2.5 border"
               style={{ background: BG[status], borderColor: BORDER[status] }}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-bold" style={{ color: "#3D3D3D" }}>
                  {s.last_name}, {s.first_name}
                </span>
                <span className="ml-2 text-[10px]" style={{ color: "#999" }}>Gr {s.grade}</span>

                {status === "reported" && (
                  <span className="ml-2 text-[10px] font-bold" style={{ color: "#CE2033" }}>
                    Reported missing
                  </span>
                )}
                {status === "with_me" && (
                  <span className="ml-2 text-[10px] font-bold" style={{ color: "#16A34A" }}>
                    With you
                  </span>
                )}
                {status === "found" && (
                  <span className="ml-2 text-[10px] font-bold" style={{ color: "#16A34A" }}>
                    &#x2713; Found
                  </span>
                )}
              </div>

              {(status === "none" || status === "error") && (
                <div className="flex gap-1.5">
                  <button onClick={() => reportMissing(s.id)} disabled={isLoading}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-white"
                          style={{ background: "#CE2033" }}>
                    Missing
                  </button>
                  <button onClick={() => withMe(s.id)} disabled={isLoading}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-bold"
                          style={{ background: "#EAEAEA", color: "#3D3D3D" }}>
                    With Me
                  </button>
                </div>
              )}

              {isLoading && (
                <span className="text-[10px]" style={{ color: "#999" }}>Saving…</span>
              )}

              {(status === "reported" || status === "with_me") && (
                <button onClick={() => setStatus(s.id, "none")}
                        className="text-[10px]" style={{ color: "#999" }}>
                  undo
                </button>
              )}

              {status === "found" && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "#F0FDF4", color: "#166534" }}>
                  Resolved
                </span>
              )}
            </div>

            {errMsg && (
              <p className="text-[10px] mt-1 font-semibold" style={{ color: "#CE2033" }}>{errMsg}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
