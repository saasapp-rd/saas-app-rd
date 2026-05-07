"use client"
import { useState, FormEvent } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface Student {
  id:         string
  first_name: string
  last_name:  string
  grade:      number
}

export default function WelfareConcernPage() {
  const router = useRouter()

  const [query,    setQuery]    = useState("")
  const [results,  setResults]  = useState<Student[]>([])
  const [selected, setSelected] = useState<Student | null>(null)
  const [note,     setNote]     = useState("")
  const [loading,  setLoading]  = useState(false)
  const [searching, setSearching] = useState(false)
  const [done,     setDone]     = useState(false)
  const [error,    setError]    = useState("")

  async function handleSearch(e: FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    setSelected(null)
    setResults([])
    const r = await fetch("/api/students/search?q=" + encodeURIComponent(query))
    const data = await r.json()
    setResults(data.students ?? [])
    setSearching(false)
  }

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
      const d = await r.json()
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
          {selected ? selected.first_name + " " + selected.last_name : "this student"}.
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
      <header className="px-5 py-3.5 flex items-center justify-between" style={{ background: "#CE2033" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">Welfare Concern</div>
          <div className="text-white text-[10px] opacity-70">Report to coordinator</div>
        </div>
        <Link href="/staff" className="text-white text-[10px] font-bold opacity-80"
              style={{ textDecoration: "none" }}>
          Cancel
        </Link>
      </header>

      <main className="flex-1 flex flex-col px-5 py-5 gap-5 max-w-lg mx-auto w-full">

        {/* Step 1: Search */}
        <div>
          <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
             style={{ color: "#3D3D3D", opacity: 0.4 }}>
            Step 1 &mdash; Find the student
          </p>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Search by name..."
              value={query}
              onChange={e => { setQuery(e.target.value); setSelected(null) }}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm border outline-none"
              style={{ borderColor: "#EAEAEA", background: "#FAFAFA", color: "#3D3D3D" }}
            />
            <button
              type="submit"
              disabled={searching || !query.trim()}
              className="px-4 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: "#A6192E", opacity: searching ? 0.6 : 1 }}
            >
              {searching ? "…" : "Search"}
            </button>
          </form>
        </div>

        {/* Search results */}
        {results.length > 0 && !selected && (
          <div className="flex flex-col gap-1.5">
            {results.map(s => (
              <button
                key={s.id}
                onClick={() => setSelected(s)}
                className="w-full rounded-xl px-4 py-3 border text-left flex items-center justify-between"
                style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}
              >
                <span className="text-sm font-semibold" style={{ color: "#3D3D3D" }}>
                  {s.last_name}, {s.first_name}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "#EAEAEA", color: "#3D3D3D" }}>
                  Gr {s.grade}
                </span>
              </button>
            ))}
          </div>
        )}

        {results.length === 0 && query && !searching && (
          <p className="text-xs text-center" style={{ color: "#999" }}>
            No students found for &ldquo;{query}&rdquo;
          </p>
        )}

        {/* Step 2: Confirm + note */}
        {selected && (
          <div>
            <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
               style={{ color: "#3D3D3D", opacity: 0.4 }}>
              Step 2 &mdash; Confirm and add details
            </p>

            <div className="rounded-xl p-4 mb-3 flex items-center justify-between"
                 style={{ background: "#FFF0F0", border: "1.5px solid #CE2033" }}>
              <div>
                <div className="text-sm font-bold" style={{ color: "#A6192E" }}>
                  {selected.last_name}, {selected.first_name}
                </div>
                <div className="text-[10px]" style={{ color: "#CE2033", opacity: 0.7 }}>
                  Grade {selected.grade}
                </div>
              </div>
              <button
                onClick={() => { setSelected(null); setResults([]) }}
                className="text-[10px] font-bold"
                style={{ color: "#999" }}
              >
                Change
              </button>
            </div>

            <textarea
              placeholder="What are you observing? (optional)"
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
              style={{ background: "#CE2033", opacity: loading ? 0.6 : 1 }}
            >
              {loading ? "Reporting…" : "Report Welfare Concern"}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
