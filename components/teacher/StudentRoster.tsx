"use client"
import { useState } from "react"

interface Student { id: string; first_name: string; last_name: string; grade: number }
type Status = "none" | "reported" | "with_me" | "loading"

export default function StudentRoster({
  students,
  blockNumber,
  courseId,
}: {
  students:    Student[]
  blockNumber: number
  courseId:    string
}) {
  const [statuses, setStatuses] = useState<Record<string, Status>>({})

  function setStatus(id: string, s: Status) {
    setStatuses(prev => ({ ...prev, [id]: s }))
  }

  async function reportMissing(studentId: string) {
    setStatus(studentId, "loading")
    const res = await fetch("/api/teacher/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: studentId, block_number: blockNumber, course_id: courseId }),
    })
    setStatus(studentId, res.ok ? "reported" : "none")
  }

  async function withMe(studentId: string) {
    setStatus(studentId, "loading")
    const res = await fetch("/api/teacher/with-me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: studentId, block_number: blockNumber, course_id: courseId }),
    })
    setStatus(studentId, res.ok ? "with_me" : "none")
  }

  return (
    <div className="flex flex-col gap-1.5">
      {students.map(s => {
        const status = statuses[s.id] ?? "none"
        const isLoading = status === "loading"

        return (
          <div key={s.id} className="rounded-xl px-4 py-2.5 border flex items-center justify-between"
               style={{
                 background:   status === "reported" ? "#FFF8F8"
                             : status === "with_me"  ? "#F0FDF4"
                             : "#FAFAFA",
                 borderColor:  status === "reported" ? "#CE2033"
                             : status === "with_me"  ? "#22C55E"
                             : "#EAEAEA",
               }}>
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
            </div>

            {status === "none" && (
              <div className="flex gap-1.5">
                <button
                  onClick={() => reportMissing(s.id)}
                  disabled={isLoading}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-white"
                  style={{ background: "#CE2033" }}>
                  Missing
                </button>
                <button
                  onClick={() => withMe(s.id)}
                  disabled={isLoading}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-bold"
                  style={{ background: "#EAEAEA", color: "#3D3D3D" }}>
                  With Me
                </button>
              </div>
            )}

            {status === "loading" && (
              <span className="text-[10px]" style={{ color: "#999" }}>Saving…</span>
            )}

            {(status === "reported" || status === "with_me") && (
              <button
                onClick={() => setStatus(s.id, "none")}
                className="text-[10px]"
                style={{ color: "#999" }}>
                undo
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
