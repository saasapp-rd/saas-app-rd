"use client"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import ScrollList from "./ScrollList"

export interface Counselor {
  id:   string
  name: string
}

export interface Student {
  id:           string
  first_name:   string | null
  last_name:    string | null
  grade:        number | null
  veracross_id: string | null
}

export default function CounselorCaseloads({
  counselors,
  students,
  caseloadByCounselor,
}: {
  counselors:          Counselor[]
  students:            Student[]
  caseloadByCounselor: Record<string, string[]>
}) {
  const router = useRouter()
  const [openId,  setOpenId]  = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [search,  setSearch]  = useState("")
  const [error,   setError]   = useState("")

  const studentById = useMemo(() => {
    const m = new Map<string, Student>()
    for (const s of students) m.set(s.id, s)
    return m
  }, [students])

  async function add(counselorId: string, studentId: string) {
    const key = `${counselorId}:${studentId}`
    setBusyKey(key); setError("")
    const res = await fetch("/api/admin/counselor-caseload", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ counselor_id: counselorId, student_id: studentId }),
    })
    if (res.ok) router.refresh()
    else { const d = await res.json().catch(() => ({})); setError(d.error ?? "Failed to add.") }
    setBusyKey(null)
  }

  async function remove(counselorId: string, studentId: string) {
    const key = `${counselorId}:${studentId}`
    setBusyKey(key); setError("")
    const res = await fetch("/api/admin/counselor-caseload", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ counselor_id: counselorId, student_id: studentId }),
    })
    if (res.ok) router.refresh()
    else { const d = await res.json().catch(() => ({})); setError(d.error ?? "Failed to remove.") }
    setBusyKey(null)
  }

  function studentName(s: Student) {
    return [s.last_name, s.first_name].filter(Boolean).join(", ") || "Unknown"
  }

  return (
    <div className="flex flex-col gap-2">
      {counselors.map(c => {
        const ids       = caseloadByCounselor[c.id] ?? []
        const caseload  = ids.map(id => studentById.get(id)).filter((s): s is Student => !!s)
        const enrolled  = new Set(ids)
        const isOpen    = openId === c.id
        const q         = search.trim().toLowerCase()
        const available = isOpen
          ? students
              .filter(s => !enrolled.has(s.id))
              .filter(s => {
                if (!q) return true
                const fullName = `${s.last_name ?? ""} ${s.first_name ?? ""}`.toLowerCase()
                return fullName.includes(q)
                  || (s.veracross_id ?? "").toLowerCase().includes(q)
                  || String(s.grade ?? "").includes(q)
              })
          : []

        return (
          <div key={c.id} className="rounded-xl border overflow-hidden"
               style={{ borderColor: "#EAEAEA" }}>
            {/* Header row */}
            <button onClick={() => {
                      setOpenId(o => o === c.id ? null : c.id)
                      setSearch("")
                    }}
                    className="w-full px-4 py-3 flex items-center justify-between"
                    style={{
                      background: isOpen ? "#FFF8F8" : "#FAFAFA",
                      border: "none", cursor: "pointer",
                    }}>
              <div className="min-w-0 text-left">
                <p className="text-sm font-bold" style={{ color: "#3D3D3D" }}>{c.name}</p>
                <p className="text-[10px]" style={{ color: "#999" }}>
                  {caseload.length} student{caseload.length === 1 ? "" : "s"} on caseload
                </p>
              </div>
              <span className="text-xs" style={{ color: isOpen ? "#A6192E" : "#BABABA" }}>
                {isOpen ? "▲" : "▼"}
              </span>
            </button>

            {/* Caseload + picker */}
            {isOpen && (
              <div className="px-4 py-3 border-t flex flex-col gap-3"
                   style={{ background: "#fff", borderColor: "#EAEAEA" }}>
                {/* Current caseload */}
                {caseload.length === 0 ? (
                  <p className="text-[10px] py-2 text-center" style={{ color: "#999" }}>
                    No students assigned to this caseload yet.
                  </p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {caseload.map(s => {
                      const key = `${c.id}:${s.id}`
                      const isBusy = busyKey === key
                      return (
                        <div key={s.id}
                             className="rounded-lg border flex items-center justify-between gap-2"
                             style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
                          <Link href={`/students/${s.id}/profile`}
                                className="min-w-0 flex-1 px-3 py-1.5"
                                style={{ textDecoration: "none" }}>
                            <span className="text-xs font-semibold" style={{ color: "#3D3D3D" }}>
                              {studentName(s)}
                            </span>
                            <span className="text-[10px] ml-1.5" style={{ color: "#999" }}>
                              Gr {s.grade ?? "?"}
                              {s.veracross_id ? ` · ${s.veracross_id}` : ""}
                            </span>
                          </Link>
                          <button onClick={() => remove(c.id, s.id)} disabled={isBusy}
                            className="text-[10px] font-bold rounded-lg flex-shrink-0 mr-2"
                            style={{
                              background: "#FFF0F0", color: "#CE2033",
                              border: "1px solid #FECACA",
                              cursor: "pointer", opacity: isBusy ? 0.5 : 1,
                              padding: "4px 10px",
                            }}>
                            {isBusy ? "…" : "Remove"}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Add student picker */}
                <div className="flex flex-col gap-2">
                  <input type="search"
                    placeholder="Add student — search by name, grade, or Veracross ID…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                    style={{ borderColor: "#EAEAEA", background: "#FAFAFA", color: "#3D3D3D" }}
                  />
                  {available.length === 0 ? (
                    <p className="text-[10px] text-center py-2" style={{ color: "#999" }}>
                      {search ? "No matching students." : "All active students already on this caseload."}
                    </p>
                  ) : (
                    <ScrollList maxHeight={320}
                                className="flex flex-col gap-1 rounded-lg"
                                style={{ border: "1px solid #EAEAEA" }}>
                      {available.map(s => {
                        const key    = `${c.id}:${s.id}`
                        const isBusy = busyKey === key
                        return (
                          <button key={s.id} onClick={() => add(c.id, s.id)} disabled={isBusy}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-left"
                            style={{
                              background: "#FAFAFA", border: "1px solid #EAEAEA",
                              cursor: "pointer", opacity: isBusy ? 0.5 : 1,
                            }}>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate" style={{ color: "#3D3D3D" }}>
                                {studentName(s)}
                              </p>
                              <p className="text-[10px] truncate" style={{ color: "#999" }}>
                                Gr {s.grade ?? "?"}
                                {s.veracross_id ? ` · ${s.veracross_id}` : ""}
                              </p>
                            </div>
                            <span className="text-[10px] font-bold flex-shrink-0"
                                  style={{ color: "#1E5FA6" }}>
                              {isBusy ? "…" : "+ Add"}
                            </span>
                          </button>
                        )
                      })}
                    </ScrollList>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {error && (
        <p className="text-xs font-semibold text-center" style={{ color: "#CE2033" }}>{error}</p>
      )}
    </div>
  )
}
