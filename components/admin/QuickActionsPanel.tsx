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

function StudentModal({
  title,
  subtitle,
  submitLabel,
  accentColor,
  apiEndpoint,
  students,
  onClose,
}: {
  title:       string
  subtitle:    string
  submitLabel: (s: Student) => string
  accentColor: string
  apiEndpoint: string
  students:    Student[]
  onClose:     () => void
}) {
  const router   = useRouter()
  const [query,   setQuery]   = useState("")
  const [selId,   setSelId]   = useState("")
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

  const selected = students.find(s => s.id === selId) ?? null

  async function submit() {
    if (!selId) { setError("Please select a student."); return }
    setLoading(true); setError("")
    const res  = await fetch(apiEndpoint, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ student_id: selId }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "Something went wrong."); setLoading(false); return }
    router.push("/coordinator/" + data.id)
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 480,
          background: "#fff", borderRadius: "20px 20px 0 0",
          padding: "20px 20px calc(20px + env(safe-area-inset-bottom, 0px))",
          display: "flex", flexDirection: "column", gap: 14,
        }}>

        {/* Drag handle */}
        <div style={{
          width: 36, height: 4, background: "#E0E0E0",
          borderRadius: 2, alignSelf: "center", marginBottom: 2,
        }} />

        {/* Title */}
        <div>
          <p style={{ fontWeight: 800, fontSize: 15, color: "#3D3D3D", margin: 0 }}>{title}</p>
          <p style={{ fontSize: 11, color: "#999", margin: "3px 0 0" }}>{subtitle}</p>
        </div>

        {/* Search input */}
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setSelId("") }}
          placeholder="Search by name…"
          autoFocus
          style={{
            padding: "11px 14px", borderRadius: 12,
            border: "1px solid #EAEAEA", background: "#FAFAFA",
            fontSize: 14, color: "#3D3D3D", outline: "none", width: "100%",
            boxSizing: "border-box",
          }}
        />

        {/* Student selector */}
        <select
          value={selId}
          onChange={e => setSelId(e.target.value)}
          style={{
            padding: "11px 14px", borderRadius: 12,
            border: `1.5px solid ${selId ? accentColor : "#EAEAEA"}`,
            background: "#FAFAFA", fontSize: 14,
            color: selId ? "#3D3D3D" : "#999",
            outline: "none", width: "100%", boxSizing: "border-box",
          }}>
          <option value="">
            {filtered.length === students.length
              ? `Select a student (${students.length} total)…`
              : filtered.length === 0
                ? "No matches — try a different name"
                : `${filtered.length} match${filtered.length !== 1 ? "es" : ""} — select one`}
          </option>
          {filtered.map(s => (
            <option key={s.id} value={s.id}>
              {s.last_name}, {s.call_by ?? s.first_name} — Gr {s.grade}
            </option>
          ))}
        </select>

        {error && (
          <p style={{ fontSize: 11, fontWeight: 600, color: "#CE2033", margin: 0 }}>{error}</p>
        )}

        {/* Submit */}
        <button
          onClick={submit}
          disabled={loading || !selId}
          style={{
            padding: "14px", borderRadius: 14, border: "none",
            fontSize: 14, fontWeight: 800,
            background: accentColor, color: "#fff",
            opacity: loading || !selId ? 0.45 : 1,
            cursor: !selId ? "default" : "pointer",
          }}>
          {loading
            ? "Submitting…"
            : selected
              ? submitLabel(selected)
              : "Select a student first"}
        </button>

        {/* Cancel */}
        <button
          onClick={onClose}
          style={{
            padding: "11px", borderRadius: 12,
            border: "1px solid #EAEAEA", background: "#FAFAFA",
            fontSize: 13, fontWeight: 600, color: "#999", cursor: "pointer",
          }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function QuickActionsPanel({ students }: { students: Student[] }) {
  const [welModal,     setWelModal]     = useState(false)
  const [missingModal, setMissingModal] = useState(false)

  return (
    <>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#EAEAEA" }}>
        <div className="px-4 py-2.5 border-b" style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em]"
             style={{ color: "#3D3D3D", opacity: 0.45 }}>
            Quick Actions
          </p>
        </div>
        <div className="px-4 py-3 flex flex-col gap-2" style={{ background: "#fff" }}>

          {/* Welfare Concern */}
          <button
            onClick={() => setWelModal(true)}
            className="w-full rounded-xl px-4 py-3 flex items-center gap-3 text-left"
            style={{ background: "#FFFBEB", border: "1px solid #FDE68A", cursor: "pointer" }}>
            <span className="text-lg">⚠️</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold" style={{ color: "#92400E" }}>
                Report Welfare Concern
              </p>
              <p className="text-[10px]" style={{ color: "#B45309" }}>
                Flag a student for counselor follow-up
              </p>
            </div>
          </button>

          {/* Report Missing — more prominent */}
          <button
            onClick={() => setMissingModal(true)}
            className="w-full rounded-xl px-4 py-3 flex items-center gap-3 text-left"
            style={{ background: "#FFF0F0", border: "2px solid #CE2033", cursor: "pointer" }}>
            <span className="text-lg">🔴</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold" style={{ color: "#A6192E" }}>
                Report a Missing Student
              </p>
              <p className="text-[10px]" style={{ color: "#CE2033", opacity: 0.8 }}>
                Open a missing student incident immediately
              </p>
            </div>
          </button>
        </div>
      </div>

      {welModal && (
        <StudentModal
          title="Report Welfare Concern"
          subtitle="Flag a student for counselor follow-up"
          apiEndpoint="/api/admin/report-welfare"
          accentColor="#92400E"
          submitLabel={s => `Flag ${s.call_by ?? s.first_name} ${s.last_name}`}
          students={students}
          onClose={() => setWelModal(false)}
        />
      )}

      {missingModal && (
        <StudentModal
          title="Report Missing Student"
          subtitle="Opens an incident — you'll be taken to the coordinator view"
          apiEndpoint="/api/admin/report-missing"
          accentColor="#A6192E"
          submitLabel={s => `Report ${s.call_by ?? s.first_name} ${s.last_name} Missing`}
          students={students}
          onClose={() => setMissingModal(false)}
        />
      )}
    </>
  )
}
