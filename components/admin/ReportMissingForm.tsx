"use client"
import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"

interface Student {
  id:         string
  first_name: string
  last_name:  string
  grade:      number
  call_by:    string | null
}

export default function ReportMissingForm({ students }: { students: Student[] }) {
  const router   = useRouter()
  const [query,   setQuery]   = useState("")
  const [selId,   setSelId]   = useState("")
  const [block,   setBlock]   = useState("")
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState("")

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    if (!q) return students
    return students.filter(s =>
      s.last_name.toLowerCase().includes(q) ||
      s.first_name.toLowerCase().includes(q) ||
      (s.call_by ?? "").toLowerCase().includes(q)
    )
  }, [query, students])

  const selected = students.find(s => s.id === selId)

  async function submit() {
    if (!selId) { setError("Please select a student."); return }
    setLoading(true); setError("")
    const res = await fetch("/api/admin/report-missing", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ student_id: selId, block_id: block ? parseInt(block) : null }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "Failed to report."); setLoading(false); return }
    router.push("/coordinator/" + data.id)
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#EAEAEA" }}>
      <div className="px-4 py-3 border-b" style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
        <p className="text-[9px] font-bold uppercase tracking-[0.2em]"
           style={{ color: "#3D3D3D", opacity: 0.45 }}>
          Report Missing Student
        </p>
      </div>
      <div className="px-4 py-4 flex flex-col gap-3" style={{ background: "#fff" }}>

        {/* Search */}
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setSelId("") }}
          placeholder="Search by name…"
          className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
          style={{ borderColor: "#EAEAEA", background: "#FAFAFA", color: "#3D3D3D" }}
        />

        {/* Select */}
        <select
          value={selId}
          onChange={e => setSelId(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
          style={{
            borderColor: selId ? "#A6192E" : "#EAEAEA",
            background:  "#FAFAFA",
            color:        selId ? "#3D3D3D" : "#999",
          }}>
          <option value="">
            {filtered.length === students.length
              ? `Select a student (${students.length} total)…`
              : `${filtered.length} match${filtered.length !== 1 ? "es" : ""}…`}
          </option>
          {filtered.map(s => (
            <option key={s.id} value={s.id}>
              {s.last_name}, {s.call_by ?? s.first_name} — Gr {s.grade}
            </option>
          ))}
        </select>

        {/* Block (optional) */}
        <select
          value={block}
          onChange={e => setBlock(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
          style={{ borderColor: "#EAEAEA", background: "#FAFAFA", color: block ? "#3D3D3D" : "#999" }}>
          <option value="">Block (optional)</option>
          {[1,2,3,4,5,6,7,8].map(b => (
            <option key={b} value={b}>Block {b}</option>
          ))}
        </select>

        {error && (
          <p className="text-[10px] font-semibold" style={{ color: "#CE2033" }}>{error}</p>
        )}

        <button
          onClick={submit}
          disabled={loading || !selId}
          className="w-full py-3 rounded-xl text-sm font-bold text-white"
          style={{ background: "#A6192E", opacity: loading || !selId ? 0.5 : 1, border: "none", cursor: !selId ? "default" : "pointer" }}>
          {loading
            ? "Reporting…"
            : selected
              ? `Report ${selected.call_by ?? selected.first_name} ${selected.last_name} Missing`
              : "Report Missing"}
        </button>
      </div>
    </div>
  )
}
