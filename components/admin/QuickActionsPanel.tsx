"use client"
import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"

interface Student {
  id:         string
  first_name: string | null
  last_name:  string | null
  grade:      number | null
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
    const q = query.trim().toLowerCase()
    // last_name / first_name come from the DB and may be null on
    // partially-imported student rows. Coalesce to "" so sort + filter
    // never call .localeCompare / .toLowerCase on null.
    const list = [...students].sort((a, b) =>
      (a.last_name ?? "").localeCompare(b.last_name ?? "") ||
      (a.first_name ?? "").localeCompare(b.first_name ?? "")
    )
    if (!q) return list
    return list.filter(s =>
      (s.last_name  ?? "").toLowerCase().includes(q) ||
      (s.first_name ?? "").toLowerCase().includes(q) ||
      (s.call_by    ?? "").toLowerCase().includes(q)
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
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px",
      }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 480,
          maxHeight: "85vh",
          background: "#fff",
          borderRadius: 20,
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}>

        {/* ── Fixed header ── */}
        <div style={{ padding: "20px 20px 14px", flexShrink: 0 }}>
          {/* Drag handle */}
          <div style={{
            width: 36, height: 4, background: "#E0E0E0",
            borderRadius: 2, margin: "0 auto 14px",
          }} />

          <p style={{ fontWeight: 800, fontSize: 15, color: "#3D3D3D", margin: "0 0 3px" }}>{title}</p>
          <p style={{ fontSize: 11, color: "#999", margin: "0 0 12px" }}>{subtitle}</p>

          {/* Search */}
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setSelId("") }}
            placeholder="Search by name…"
            autoFocus
            style={{
              padding: "11px 14px", borderRadius: 12,
              border: "1px solid #EAEAEA", background: "#FAFAFA",
              fontSize: 14, color: "#3D3D3D", outline: "none",
              width: "100%", boxSizing: "border-box",
            }}
          />

          <p style={{ fontSize: 10, color: "#BABABA", margin: "7px 0 0", fontWeight: 600 }}>
            {filtered.length === students.length
              ? `${students.length} students — sorted A–Z`
              : filtered.length === 0
                ? "No matches"
                : `${filtered.length} match${filtered.length !== 1 ? "es" : ""}`}
          </p>
        </div>

        {/* ── Scrollable student list ── */}
        <div style={{
          flex: 1, overflowY: "auto", minHeight: 0,
          borderTop: "1px solid #F0F0F0",
          borderBottom: "1px solid #F0F0F0",
        }}>
          {filtered.length === 0 ? (
            <p style={{ padding: "20px 20px", fontSize: 13, color: "#999", textAlign: "center" }}>
              No students match "{query}"
            </p>
          ) : (
            filtered.map(s => {
              const isSelected = s.id === selId
              return (
                <button
                  key={s.id}
                  onClick={() => setSelId(s.id)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center",
                    justifyContent: "space-between",
                    padding: "11px 20px",
                    background: isSelected ? "#FFF0F0" : "transparent",
                    border: "none",
                    borderBottom: "1px solid #F5F5F5",
                    cursor: "pointer", textAlign: "left",
                  }}>
                  <span style={{ fontSize: 13, fontWeight: isSelected ? 700 : 400, color: isSelected ? accentColor : "#3D3D3D" }}>
                    {s.last_name ?? "—"}, {s.call_by ?? s.first_name ?? "—"}
                  </span>
                  <span style={{ fontSize: 11, color: "#BABABA", flexShrink: 0, marginLeft: 8 }}>
                    Gr {s.grade}
                    {isSelected && <span style={{ marginLeft: 6 }}>✓</span>}
                  </span>
                </button>
              )
            })
          )}
        </div>

        {/* ── Fixed footer ── */}
        <div style={{ padding: "14px 20px 20px", flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {error && (
            <p style={{ fontSize: 11, fontWeight: 600, color: "#CE2033", margin: 0 }}>{error}</p>
          )}

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
    </div>
  )
}

export default function QuickActionsPanel({
  students,
  only,
}: {
  students: Student[]
  /** Limit to a single button (e.g. "welfare" on /missing for staff). */
  only?:    "welfare" | "missing"
}) {
  const [welModal,     setWelModal]     = useState(false)
  const [missingModal, setMissingModal] = useState(false)

  const showWelfare = only !== "missing"
  const showMissing = only !== "welfare"

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

          {showWelfare && (
            <button
              onClick={() => setWelModal(true)}
              className="w-full rounded-xl px-4 py-3 flex items-center gap-3 text-left"
              style={{ background: "#FFFBEB", border: "1px solid #FDE68A", cursor: "pointer" }}>
              <span className="text-lg">⚠️</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold" style={{ color: "#92400E" }}>Report Welfare Concern</p>
                <p className="text-[10px]" style={{ color: "#B45309" }}>Flag a student for counselor follow-up</p>
              </div>
            </button>
          )}

          {showMissing && (
            <button
              onClick={() => setMissingModal(true)}
              className="w-full rounded-xl px-4 py-3 flex items-center gap-3 text-left"
              style={{ background: "#FFF0F0", border: "2px solid #CE2033", cursor: "pointer" }}>
              <span className="text-lg">🔴</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold" style={{ color: "#A6192E" }}>Report a Missing Student</p>
                <p className="text-[10px]" style={{ color: "#CE2033", opacity: 0.8 }}>Open a missing student incident immediately</p>
              </div>
            </button>
          )}
        </div>
      </div>

      {welModal && (
        <StudentModal
          title="Report Welfare Concern"
          subtitle="Flag a student for counselor follow-up"
          apiEndpoint="/api/admin/report-welfare"
          accentColor="#92400E"
          submitLabel={s => `Flag ${s.call_by ?? s.first_name ?? ""} ${s.last_name ?? ""}`.trim()}
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
          submitLabel={s => `Report ${s.call_by ?? s.first_name ?? ""} ${s.last_name ?? ""} Missing`.trim()}
          students={students}
          onClose={() => setMissingModal(false)}
        />
      )}
    </>
  )
}
