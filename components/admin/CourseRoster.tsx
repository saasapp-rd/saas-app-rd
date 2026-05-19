"use client"
import { useState, useMemo, useEffect } from "react"
import Link from "next/link"

export interface RosterStudent {
  id:           string
  first_name:   string | null
  last_name:    string | null
  call_by:      string | null
  grade:        number | null
  veracross_id: string | null
  is_active:    boolean | null
  advisor_name: string | null
}

function sortByName(a: RosterStudent, b: RosterStudent): number {
  return (a.last_name ?? "").localeCompare(b.last_name ?? "")
      || (a.first_name ?? "").localeCompare(b.first_name ?? "")
}

export default function CourseRoster({
  courseId,
  initialRoster,
  allStudents = [],
  canEdit = false,
}: {
  courseId:       string
  initialRoster:  RosterStudent[]
  allStudents?:   RosterStudent[]
  canEdit?:       boolean
}) {
  const [roster,      setRoster]      = useState(initialRoster)
  const [pickerOpen,  setPickerOpen]  = useState(false)
  const [search,      setSearch]      = useState("")
  const [busy,        setBusy]        = useState<string | null>(null)
  const [error,       setError]       = useState("")

  // Lock body scroll + listen for Escape while the modal is open.
  useEffect(() => {
    if (!pickerOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPickerOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener("keydown", onKey)
    }
  }, [pickerOpen])

  const enrolledIds = useMemo(
    () => new Set(roster.map(s => s.id)),
    [roster]
  )

  const availableStudents = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allStudents
      .filter(s => !enrolledIds.has(s.id))
      .filter(s => {
        if (!q) return true
        const fullName = `${s.last_name ?? ""} ${s.first_name ?? ""} ${s.call_by ?? ""}`.toLowerCase()
        return fullName.includes(q)
          || (s.veracross_id ?? "").toLowerCase().includes(q)
          || String(s.grade ?? "").includes(q)
      })
      .sort(sortByName)
  }, [allStudents, enrolledIds, search])

  async function add(s: RosterStudent) {
    setBusy(s.id); setError("")
    const res = await fetch("/api/admin/student-enrollments", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ student_id: s.id, course_id: courseId }),
    })
    if (res.ok) {
      setRoster(prev => [...prev, s].sort(sortByName))
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? "Failed to add student.")
    }
    setBusy(null)
  }

  async function remove(s: RosterStudent) {
    setBusy(s.id); setError("")
    const res = await fetch("/api/admin/student-enrollments", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ student_id: s.id, course_id: courseId }),
    })
    if (res.ok) {
      setRoster(prev => prev.filter(x => x.id !== s.id))
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? "Failed to remove student.")
    }
    setBusy(null)
  }

  const activeCount = roster.filter(s => s.is_active !== false).length

  return (
    <div className="flex flex-col gap-3">

      <p className="text-[9px] font-bold tracking-[0.25em] uppercase"
         style={{ color: "#3D3D3D", opacity: 0.35 }}>
        Enrolled — {activeCount} active{roster.length !== activeCount ? ` · ${roster.length} total` : ""}
      </p>

      {/* Roster list */}
      {roster.length === 0 ? (
        <p className="text-xs text-center py-6" style={{ color: "#999" }}>
          No students enrolled yet.
          {canEdit && " Use the picker below to add the first one."}
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {roster.map(s => {
            const name = [s.last_name, s.first_name].filter(Boolean).join(", ") || "Unknown"
            const isActive = s.is_active !== false
            const isBusy   = busy === s.id
            return (
              <div key={s.id}
                   className="rounded-xl border flex items-center justify-between gap-2"
                   style={{
                     background:  isActive ? "#FAFAFA" : "#FFF5F5",
                     borderColor: isActive ? "#EAEAEA" : "#FECACA",
                     opacity:     isActive ? 1 : 0.7,
                   }}>
                <Link href={`/students/${s.id}`}
                      className="min-w-0 flex-1 px-3 py-2"
                      style={{ textDecoration: "none" }}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold" style={{ color: "#3D3D3D" }}>
                      {name}
                    </span>
                    {s.call_by && s.call_by !== s.first_name && (
                      <span className="text-[10px]" style={{ color: "#999" }}>
                        ({s.call_by})
                      </span>
                    )}
                    {!isActive && (
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase"
                            style={{ background: "#FEE2E2", color: "#CE2033" }}>
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="text-[10px]" style={{ color: "#999" }}>
                    {s.grade ? `Gr ${s.grade}` : "No grade"}
                    {s.veracross_id && (
                      <span> · <span style={{ fontFamily: "monospace" }}>ID {s.veracross_id}</span></span>
                    )}
                    {s.advisor_name && ` · ${s.advisor_name}`}
                  </div>
                </Link>
                {canEdit && (
                  <button onClick={() => remove(s)} disabled={isBusy}
                          className="text-[10px] font-bold px-2.5 py-1 rounded-lg flex-shrink-0 mr-2"
                          style={{
                            background: "#FFF0F0", color: "#CE2033",
                            border: "1px solid #FECACA", cursor: "pointer",
                            opacity: isBusy ? 0.5 : 1,
                          }}>
                    {isBusy ? "…" : "Remove"}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add student trigger button */}
      {canEdit && (
        <button onClick={() => { setPickerOpen(true); setSearch("") }}
          className="rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider"
          style={{
            background: "#A6192E", color: "#fff", border: "none", cursor: "pointer",
          }}>
          + Add student
        </button>
      )}

      {/* Add-student modal */}
      {canEdit && pickerOpen && (
        <div
          onClick={() => setPickerOpen(false)}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
          style={{ background: "rgba(0,0,0,0.55)" }}>
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white w-full sm:max-w-md flex flex-col rounded-t-2xl sm:rounded-2xl"
            style={{ maxHeight: "85vh", overscrollBehavior: "contain" }}>

            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between border-b"
                 style={{ borderColor: "#EAEAEA" }}>
              <div className="min-w-0">
                <p className="text-sm font-bold" style={{ color: "#3D3D3D" }}>
                  Add Student
                </p>
                <p className="text-[10px]" style={{ color: "#999" }}>
                  {availableStudents.length} student{availableStudents.length === 1 ? "" : "s"} available
                </p>
              </div>
              <button onClick={() => setPickerOpen(false)}
                className="text-sm font-bold w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "#EAEAEA", color: "#3D3D3D", border: "none", cursor: "pointer" }}
                aria-label="Close">
                ✕
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b" style={{ borderColor: "#EAEAEA" }}>
              <input
                type="search"
                placeholder="Search by name, grade, or Veracross ID…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                style={{ borderColor: "#EAEAEA", background: "#FAFAFA", color: "#3D3D3D" }}
                autoFocus
              />
            </div>

            {/* List — the only scrollable area */}
            <div className="flex-1 overflow-y-auto px-3 py-2"
                 style={{ overscrollBehavior: "contain" }}>
              {availableStudents.length === 0 ? (
                <p className="text-xs text-center py-6" style={{ color: "#999" }}>
                  {search ? "No matching students." : "All active students already enrolled."}
                </p>
              ) : (
                <div className="flex flex-col gap-1">
                  {availableStudents.map(s => {
                    const isBusy = busy === s.id
                    const name = [s.last_name, s.first_name].filter(Boolean).join(", ") || "Unknown"
                    return (
                      <button key={s.id} onClick={() => add(s)} disabled={isBusy}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-left"
                        style={{
                          background: "#FAFAFA", border: "1px solid #EAEAEA",
                          cursor: "pointer", opacity: isBusy ? 0.5 : 1,
                        }}>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold truncate" style={{ color: "#3D3D3D" }}>
                            {name}
                            {s.call_by && s.call_by !== s.first_name && (
                              <span className="ml-1.5 text-[10px] font-normal" style={{ color: "#999" }}>
                                ({s.call_by})
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] truncate" style={{ color: "#999" }}>
                            {s.grade ? `Gr ${s.grade}` : "No grade"}
                            {s.veracross_id && (
                              <span> · <span style={{ fontFamily: "monospace" }}>ID {s.veracross_id}</span></span>
                            )}
                            {s.advisor_name && ` · ${s.advisor_name}`}
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

            {/* Footer */}
            <div className="px-4 py-2.5 border-t flex items-center justify-between"
                 style={{ borderColor: "#EAEAEA", background: "#FAFAFA" }}>
              <p className="text-[10px]" style={{ color: "#999" }}>
                Tap outside or press Esc to close
              </p>
              <button onClick={() => setPickerOpen(false)}
                className="text-[10px] font-bold px-3 py-1.5 rounded-lg"
                style={{ background: "#EAEAEA", color: "#3D3D3D", border: "none", cursor: "pointer" }}>
                Done
              </button>
            </div>

          </div>
        </div>
      )}

      {error && (
        <p className="text-[10px] font-semibold text-center" style={{ color: "#CE2033" }}>{error}</p>
      )}
    </div>
  )
}
