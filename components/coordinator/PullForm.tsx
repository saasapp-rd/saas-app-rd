"use client"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"

interface Student { id: string; first_name: string; last_name: string; grade: number }

export default function PullForm({ onCancel }: { onCancel: () => void }) {
  const router        = useRouter()
  const [query,       setQuery]       = useState("")
  const [results,     setResults]     = useState<Student[]>([])
  const [selected,    setSelected]    = useState<Student | null>(null)
  const [reason,      setReason]      = useState("")
  const [level,       setLevel]       = useState("routine")
  const [searching,   setSearching]   = useState(false)
  const [submitting,  setSubmitting]  = useState(false)
  const [error,       setError]       = useState("")
  const debounce      = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      setSearching(true)
      const res  = await fetch("/api/students/search?q=" + encodeURIComponent(query))
      const data = await res.json()
      setResults(data.students ?? [])
      setSearching(false)
    }, 300)
  }, [query])

  async function submit() {
    if (!selected || submitting) return
    setSubmitting(true)
    setError("")

    const res  = await fetch("/api/coordinator/pull", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ student_id: selected.id, reason, level }),
    })
    const data = await res.json()

    if (res.ok) {
      router.push("/coordinator/" + data.id)
    } else {
      setError(data.error ?? "Failed to pull student.")
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center"
         style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="w-full max-w-lg rounded-t-2xl flex flex-col gap-4 px-5 pt-5 pb-8"
           style={{ background: "#fff" }}>

        <div className="flex items-center justify-between">
          <p className="text-sm font-black" style={{ color: "#3D3D3D" }}>Report Missing Student</p>
          <button onClick={onCancel} style={{ color: "#999", background: "none", border: "none", cursor: "pointer", fontSize: 18 }}>
            &times;
          </button>
        </div>

        {/* Student search */}
        {!selected ? (
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wide mb-1 block"
                   style={{ color: "#3D3D3D", opacity: 0.5 }}>
              Search Student
            </label>
            <input
              autoFocus
              value={query}
              onChange={e => { setQuery(e.target.value); setSelected(null) }}
              placeholder="Last name or first name..."
              className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
              style={{ borderColor: "#EAEAEA", color: "#3D3D3D" }}
            />
            {searching && (
              <p className="text-[10px] mt-1" style={{ color: "#999" }}>Searching…</p>
            )}
            {results.length > 0 && (
              <div className="mt-1 rounded-xl border overflow-hidden"
                   style={{ borderColor: "#EAEAEA" }}>
                {results.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setSelected(s); setQuery("") }}
                    className="w-full px-4 py-2.5 text-left flex items-center justify-between border-b last:border-b-0"
                    style={{ background: "#fff", borderColor: "#F4F4F4", cursor: "pointer" }}>
                    <span className="text-sm font-bold" style={{ color: "#3D3D3D" }}>
                      {s.last_name}, {s.first_name}
                    </span>
                    <span className="text-[10px]" style={{ color: "#999" }}>Grade {s.grade}</span>
                  </button>
                ))}
              </div>
            )}
            {query.length >= 2 && !searching && results.length === 0 && (
              <p className="text-[10px] mt-1 text-center py-2" style={{ color: "#999" }}>
                No students found for &ldquo;{query}&rdquo;
              </p>
            )}
          </div>
        ) : (
          <div>
            <div className="rounded-xl px-4 py-3 border flex items-center justify-between mb-3"
                 style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
              <div>
                <p className="text-sm font-bold" style={{ color: "#3D3D3D" }}>
                  {selected.last_name}, {selected.first_name}
                </p>
                <p className="text-[10px]" style={{ color: "#999" }}>Grade {selected.grade}</p>
              </div>
              <button onClick={() => setSelected(null)}
                      className="text-[10px] font-bold"
                      style={{ color: "#A6192E", background: "none", border: "none", cursor: "pointer" }}>
                Change
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide mb-1 block"
                       style={{ color: "#3D3D3D", opacity: 0.5 }}>
                  Level
                </label>
                <div className="flex gap-2">
                  {["routine","elevated"].map(l => (
                    <button
                      key={l}
                      onClick={() => setLevel(l)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold capitalize border"
                      style={{
                        background:   level === l ? (l === "elevated" ? "#A6192E" : "#3D3D3D") : "#FAFAFA",
                        color:        level === l ? "#fff" : "#3D3D3D",
                        borderColor:  level === l ? "transparent" : "#EAEAEA",
                      }}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wide mb-1 block"
                       style={{ color: "#3D3D3D", opacity: 0.5 }}>
                  Reason (optional)
                </label>
                <input
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") submit() }}
                  placeholder="e.g. Did not arrive to class, welfare check..."
                  className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
                  style={{ borderColor: "#EAEAEA", color: "#3D3D3D" }}
                />
              </div>

              {error && (
                <p className="text-[10px] font-semibold" style={{ color: "#CE2033" }}>{error}</p>
              )}

              <button
                onClick={submit}
                disabled={submitting}
                className="w-full py-3 rounded-xl text-sm font-bold text-white"
                style={{ background: "#A6192E", opacity: submitting ? 0.5 : 1 }}>
                {submitting ? "Opening…" : "Report Missing Student"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
