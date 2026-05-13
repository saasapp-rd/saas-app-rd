"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

interface Student {
  id:         string
  first_name: string
  last_name:  string
  grade:      number
}

interface Props {
  courseId:    string
  courseName:  string
  blockNumber: number
  room:        string | null
  students:    Student[]
  isActive:    boolean
}

export default function CourseRosterCard({
  courseId, courseName, blockNumber, room, students: initial, isActive,
}: Props) {
  const router                    = useRouter()
  const [open,      setOpen]      = useState(isActive)
  const [roster,    setRoster]    = useState<Student[]>(initial)
  const [query,     setQuery]     = useState("")
  const [results,   setResults]   = useState<Student[]>([])
  const [searching, setSearching] = useState(false)
  const [adding,    setAdding]    = useState<string | null>(null)
  const [removing,  setRemoving]  = useState<string | null>(null)
  const [error,     setError]     = useState("")
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      setSearching(true)
      const res  = await fetch("/api/students/search?q=" + encodeURIComponent(query))
      const data = await res.json()
      // Filter out students already on the roster
      const ids = new Set(roster.map(s => s.id))
      setResults((data.students ?? []).filter((s: Student) => !ids.has(s.id)))
      setSearching(false)
    }, 300)
  }, [query, roster])

  async function addStudent(student: Student) {
    setAdding(student.id)
    setError("")
    const res  = await fetch("/api/teacher/enrollment", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ course_id: courseId, student_id: student.id }),
    })
    const data = await res.json()
    if (res.ok) {
      setRoster(r => [...r, student].sort((a, b) => a.last_name.localeCompare(b.last_name)))
      setQuery("")
      setResults([])
      router.refresh()
    } else {
      setError(data.error ?? "Failed to add student.")
    }
    setAdding(null)
  }

  async function removeStudent(studentId: string) {
    setRemoving(studentId)
    setError("")
    const res = await fetch("/api/teacher/enrollment", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ course_id: courseId, student_id: studentId }),
    })
    const data = await res.json()
    if (res.ok) {
      setRoster(r => r.filter(s => s.id !== studentId))
      router.refresh()
    } else {
      setError(data.error ?? "Failed to remove student.")
    }
    setRemoving(null)
  }

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: isActive ? "#A6192E" : "#EAEAEA" }}>

      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-4 flex items-center justify-between text-left"
        style={{ background: open ? "#FFF8F8" : "#FAFAFA", border: "none", cursor: "pointer" }}>
        <div className="flex items-center gap-3">
          {isActive && (
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "#A6192E", color: "#fff" }}>
              NOW
            </span>
          )}
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[0.2em] mb-0.5"
                 style={{ color: "#999" }}>
              Block {blockNumber}{room ? ` · ${room}` : ""}
            </div>
            <div className="text-sm font-bold" style={{ color: "#3D3D3D" }}>{courseName}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold" style={{ color: "#BABABA" }}>
            {roster.length} student{roster.length !== 1 ? "s" : ""}
          </span>
          <span style={{ color: open ? "#A6192E" : "#BABABA", fontSize: 11 }}>
            {open ? "▲" : "▼"}
          </span>
        </div>
      </button>

      {open && (
        <div className="px-4 py-4 border-t flex flex-col gap-3"
             style={{ borderColor: "#EAEAEA", background: "#fff" }}>

          {/* Roster */}
          {roster.length === 0 ? (
            <p className="text-xs text-center py-2" style={{ color: "#999" }}>
              No students enrolled yet.
            </p>
          ) : (
            <div className="flex flex-col divide-y" style={{ borderColor: "#F4F4F4" }}>
              {roster.map(s => (
                <div key={s.id} className="flex items-center justify-between py-2">
                  <div>
                    <span className="text-sm font-semibold" style={{ color: "#3D3D3D" }}>
                      {s.last_name}, {s.first_name}
                    </span>
                    <span className="ml-2 text-[10px]" style={{ color: "#999" }}>Gr {s.grade}</span>
                  </div>
                  <button
                    onClick={() => removeStudent(s.id)}
                    disabled={removing === s.id}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg"
                    style={{
                      background: "#FFF0F0",
                      color:      "#CE2033",
                      border:     "none",
                      cursor:     removing === s.id ? "default" : "pointer",
                      opacity:    removing === s.id ? 0.5 : 1,
                    }}>
                    {removing === s.id ? "…" : "Remove"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add student */}
          <div className="pt-2 border-t" style={{ borderColor: "#F0F0F0" }}>
            <p className="text-[9px] font-bold uppercase tracking-[0.2em] mb-2"
               style={{ color: "#3D3D3D", opacity: 0.4 }}>
              Add Student
            </p>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name…"
              className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
              style={{ borderColor: "#EAEAEA", background: "#FAFAFA", color: "#3D3D3D" }}
            />
            {searching && (
              <p className="text-[10px] mt-1" style={{ color: "#999" }}>Searching…</p>
            )}
            {results.length > 0 && (
              <div className="mt-1.5 flex flex-col gap-1">
                {results.map(s => (
                  <button
                    key={s.id}
                    onClick={() => addStudent(s)}
                    disabled={adding === s.id}
                    className="w-full rounded-xl px-3 py-2 border text-left flex items-center justify-between"
                    style={{ background: "#FAFAFA", borderColor: "#EAEAEA", cursor: "pointer" }}>
                    <span className="text-sm font-semibold" style={{ color: "#3D3D3D" }}>
                      {s.last_name}, {s.first_name}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: "#EAEAEA", color: "#3D3D3D" }}>
                      {adding === s.id ? "Adding…" : `Gr ${s.grade} · Add`}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {query.length >= 2 && !searching && results.length === 0 && (
              <p className="text-[10px] mt-1.5" style={{ color: "#999" }}>No students found.</p>
            )}
          </div>

          {error && (
            <p className="text-[10px] font-semibold" style={{ color: "#CE2033" }}>{error}</p>
          )}
        </div>
      )}
    </div>
  )
}
