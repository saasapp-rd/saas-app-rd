"use client"
import { useState } from "react"
import Link from "next/link"

interface Student {
  id:         string
  first_name: string
  last_name:  string
  grade:      number
  call_by:    string | null
}

export default function WelfareConcernForm({ students }: { students: Student[] }) {
  const [query,    setQuery]    = useState("")
  const [selected, setSelected] = useState<Student | null>(null)
  const [note,     setNote]     = useState("")
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)
  const [error,    setError]    = useState("")

  // Client-side live filter — no API call needed
  const filtered = query.trim().length === 0
    ? students
    : students.filter(s => {
        const q   = query.toLowerCase()
        const name = (s.last_name + " " + s.first_name + " " +
                      (s.call_by ?? "")).toLowerCase()
        return name.includes(q)
      })

  const showList = !selected && query.trim().length > 0 && filtered.length > 0

  async function handleSubmit() {
    if (!selected) return
    setLoading(true)
    setError("")
    const r = await fetch("/api/staff/concern", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ student_id: selected.id, note }),
    })
    if (r.ok) {
      setDone(true)
    } else {
      const d = await r.json().catch(() => ({}))
      setError(d.error ?? "Something went wrong.")
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-4"
           style={{ background: "#fff" }}>
        <div className="text-5xl">&#x2705;</div>
        <p className="text-lg font-bold text-center" style={{ color: "#3D3D3D" }}>
          Concern reported
        </p>
        <p className="text-sm text-center" style={{ color: "#999" }}>
          The coordinator has been notified about{" "}
          {selected
            ? (selected.call_by ?? selected.first_name) + " " + selected.last_name
            : "this student"}.
        </p>
        <Link href="/staff"
              className="px-6 py-3 rounded-xl text-white text-sm font-bold"
              style={{ background: "#A6192E", textDecoration: "none" }}>
          Back to Staff View
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between"
              style={{ background: "#CE2033" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">
            Welfare Concern
          </div>
          <div className="text-white text-[10px] opacity-70">Report to coordinator</div>
        </div>
        <Link href="/staff" className="text-white text-[10px] font-bold opacity-80"
              style={{ textDecoration: "none" }}>
          Cancel
        </Link>
      </header>

      <main className="flex-1 flex flex-col px-5 py-5 gap-5 max-w-lg mx-auto w-full">

        {/* Step 1 — Find student */}
        <div>
          <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
             style={{ color: "#3D3D3D", opacity: 0.4 }}>
            Step 1 &mdash; Find the student
          </p>

          {selected ? (
            /* Selected state — show chip + change button */
            <div className="rounded-xl px-4 py-3 flex items-center justify-between"
                 style={{ background: "#FFF0F0", border: "1.5px solid #CE2033" }}>
              <div>
                <div className="text-sm font-bold" style={{ color: "#A6192E" }}>
                  {selected.last_name}, {selected.call_by ?? selected.first_name}
                </div>
                <div className="text-[10px]" style={{ color: "#CE2033", opacity: 0.7 }}>
                  Grade {selected.grade}
                </div>
              </div>
              <button
                onClick={() => { setSelected(null); setQuery("") }}
                className="text-[10px] font-bold"
                style={{ color: "#999" }}>
                Change
              </button>
            </div>
          ) : (
            /* Search input + live dropdown */
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Type a name to search…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoComplete="off"
                className="w-full px-4 py-3 rounded-xl text-sm border outline-none"
                style={{
                  borderColor: "#EAEAEA",
                  background:  "#FAFAFA",
                  color:       "#3D3D3D",
                  borderRadius: showList ? "12px 12px 0 0" : 12,
                }}
              />
              {showList && (
                <div className="border border-t-0 rounded-b-xl overflow-hidden"
                     style={{
                       borderColor: "#EAEAEA",
                       background:  "#fff",
                       maxHeight:   240,
                       overflowY:   "auto",
                       position:    "absolute",
                       width:       "100%",
                       zIndex:      10,
                       boxShadow:   "0 4px 16px rgba(0,0,0,0.06)",
                     }}>
                  {filtered.slice(0, 40).map(s => (
                    <button
                      key={s.id}
                      onClick={() => { setSelected(s); setQuery("") }}
                      className="w-full px-4 py-2.5 text-left flex items-center justify-between"
                      style={{ borderBottom: "1px solid #F4F4F4", background: "transparent" }}
                    >
                      <span className="text-sm" style={{ color: "#3D3D3D" }}>
                        {s.last_name}, {s.call_by ?? s.first_name}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: "#EAEAEA", color: "#3D3D3D" }}>
                        Gr {s.grade}
                      </span>
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <p className="text-xs text-center py-3" style={{ color: "#999" }}>
                      No students match &ldquo;{query}&rdquo;
                    </p>
                  )}
                </div>
              )}
              {query.trim().length > 0 && filtered.length === 0 && !showList && (
                <p className="text-xs text-center mt-2" style={{ color: "#999" }}>
                  No students match &ldquo;{query}&rdquo;
                </p>
              )}
            </div>
          )}
        </div>

        {/* Step 2 — Note + submit */}
        {selected && (
          <div>
            <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
               style={{ color: "#3D3D3D", opacity: 0.4 }}>
              Step 2 &mdash; Add details (optional)
            </p>

            <textarea
              placeholder="What are you observing?"
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl text-sm border outline-none resize-none mb-3"
              style={{ borderColor: "#EAEAEA", background: "#FAFAFA", color: "#3D3D3D" }}
            />

            {error && (
              <p className="text-xs font-semibold text-center mb-3" style={{ color: "#CE2033" }}>
                {error}
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-4 rounded-xl text-white text-sm font-bold"
              style={{ background: "#CE2033", opacity: loading ? 0.6 : 1 }}>
              {loading ? "Reporting…" : "Report Welfare Concern"}
            </button>
          </div>
        )}

      </main>
    </div>
  )
}
