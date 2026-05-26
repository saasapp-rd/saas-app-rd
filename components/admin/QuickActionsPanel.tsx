"use client"
import { useState, useMemo, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

interface Student {
  id:         string
  first_name: string | null
  last_name:  string | null
  grade:      number | null
  call_by:    string | null
}

// Sensitive categories and which roles can create them (client-side filter only —
// server enforces the same rules independently).
const SENSITIVE_CATEGORIES = ["accommodations", "nurse", "counselor_office", "other_sensitive"]
const SENSITIVE_ROLE_MAP: Record<string, string[]> = {
  accommodations:   ["accommodations", "coordinator", "dean", "admin", "super_admin"],
  nurse:            ["nurse", "coordinator", "dean", "admin", "super_admin"],
  counselor_office: ["counselor", "coordinator", "dean", "admin", "super_admin"],
  other_sensitive:  ["counselor", "nurse", "accommodations", "coordinator", "dean", "admin", "super_admin"],
}

interface CategoryDef {
  value:  string
  label:  string
  emoji:  string
  sensitive: boolean
}
const CATEGORIES: CategoryDef[] = [
  { value: "classroom",     label: "In Classroom",  emoji: "📚", sensitive: false },
  { value: "library",       label: "Library",       emoji: "📖", sensitive: false },
  { value: "advisory",      label: "Advisory",      emoji: "👥", sensitive: false },
  { value: "study_hall",    label: "Study Hall",    emoji: "📝", sensitive: false },
  { value: "gym",           label: "Gym",           emoji: "🏃", sensitive: false },
  { value: "hallway",       label: "Hallway",       emoji: "🚶", sensitive: false },
  { value: "office_misc",   label: "Office (misc)", emoji: "🏢", sensitive: false },
  { value: "accommodations",label: "Accommodations",emoji: "🎯", sensitive: true  },
  { value: "nurse",         label: "Nurse / Health",emoji: "🏥", sensitive: true  },
  { value: "counselor_office",label:"Counseling",   emoji: "💬", sensitive: true  },
  { value: "other_sensitive",label:"Other (private)",emoji:"🔒", sensitive: true  },
]

function categoriesForRole(role: string): CategoryDef[] {
  return CATEGORIES.filter(cat => {
    if (!cat.sensitive) return true
    return (SENSITIVE_ROLE_MAP[cat.value] ?? []).includes(role)
  })
}

// ── Shared modal shell ────────────────────────────────────────────────────────
function ModalShell({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 50,
      background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        // dvh (not vh) tracks the visible viewport on mobile, so the footer
        // button stays on-screen when the Safari toolbar / keyboard shows.
        width: "100%", maxWidth: 480, maxHeight: "85dvh",
        background: "#fff", borderRadius: 20,
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{ width: 36, height: 4, background: "#E0E0E0", borderRadius: 2, margin: "16px auto 0", flexShrink: 0 }} />
        {children}
      </div>
    </div>
  )
}

// ── Shared student picker (search + scrollable list) ─────────────────────────
function StudentPicker({
  students, selectedId, accentColor, onSelect,
}: {
  students:    Student[]
  selectedId:  string
  accentColor: string
  onSelect:    (id: string) => void
}) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const list = [...students].sort((a, b) =>
      (a.last_name ?? "").localeCompare(b.last_name ?? "") ||
      (a.first_name ?? "").localeCompare(b.first_name ?? "")
    )
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter(s =>
      (s.last_name  ?? "").toLowerCase().includes(q) ||
      (s.first_name ?? "").toLowerCase().includes(q) ||
      (s.call_by    ?? "").toLowerCase().includes(q)
    )
  }, [query, students])

  return (
    <>
      <input value={query}
        onChange={e => { setQuery(e.target.value); onSelect("") }}
        placeholder="Search by name…"
        /* no autoFocus: on mobile it pops the keyboard on open, hiding the list + footer button */
        style={{
          padding: "11px 14px", borderRadius: 12,
          border: "1px solid #EAEAEA", background: "#FAFAFA",
          fontSize: 14, color: "#3D3D3D", outline: "none",
          width: "100%", boxSizing: "border-box",
        }} />
      <p style={{ fontSize: 10, color: "#BABABA", margin: "7px 0 0", fontWeight: 600 }}>
        {filtered.length === students.length
          ? `${students.length} students — sorted A–Z`
          : filtered.length === 0 ? "No matches"
          : `${filtered.length} match${filtered.length !== 1 ? "es" : ""}`}
      </p>
      <div style={{
        flex: 1, overflowY: "auto", minHeight: 0,
        // contain stops touch-scroll from chaining to the page behind the modal
        overscrollBehavior: "contain", WebkitOverflowScrolling: "touch",
        borderTop: "1px solid #F0F0F0", borderBottom: "1px solid #F0F0F0",
      }}>
        {filtered.length === 0 ? (
          <p style={{ padding: "20px", fontSize: 13, color: "#999", textAlign: "center" }}>
            No students match &ldquo;{query}&rdquo;
          </p>
        ) : filtered.map(s => {
          const isSel = s.id === selectedId
          return (
            <button key={s.id} onClick={() => onSelect(s.id)} style={{
              width: "100%", display: "flex", alignItems: "center",
              justifyContent: "space-between", padding: "11px 20px",
              background: isSel ? "#FFF0F0" : "transparent",
              border: "none", borderBottom: "1px solid #F5F5F5",
              cursor: "pointer", textAlign: "left",
            }}>
              <span style={{ fontSize: 13, fontWeight: isSel ? 700 : 400, color: isSel ? accentColor : "#3D3D3D" }}>
                {s.last_name ?? "—"}, {s.call_by ?? s.first_name ?? "—"}
              </span>
              <span style={{ fontSize: 11, color: "#BABABA", flexShrink: 0, marginLeft: 8 }}>
                Gr {s.grade}{isSel ? " ✓" : ""}
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}

// ── Simple modal: welfare concern + missing student ───────────────────────────
function StudentModal({
  title, subtitle, submitLabel, accentColor, apiEndpoint, students, onClose,
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
  const [selId,   setSelId]   = useState("")
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState("")
  const selected = students.find(s => s.id === selId) ?? null

  async function submit() {
    if (!selId) { setError("Please select a student."); return }
    setLoading(true); setError("")
    const res  = await fetch(apiEndpoint, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ student_id: selId }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "Something went wrong."); setLoading(false); return }
    router.push("/coordinator/" + data.id)
  }

  return (
    <ModalShell onClose={onClose}>
      {/* flex:1 + minHeight:0 so the StudentPicker's scroll list is height-bounded
          (was flexShrink:0, which let the list grow to full height and pushed the
          footer button off-screen). */}
      <div style={{ padding: "14px 20px 14px", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 0 }}>
        <p style={{ fontWeight: 800, fontSize: 15, color: "#3D3D3D", margin: "0 0 3px" }}>{title}</p>
        <p style={{ fontSize: 11, color: "#999", margin: "0 0 12px" }}>{subtitle}</p>
        <StudentPicker students={students} selectedId={selId} accentColor={accentColor} onSelect={setSelId} />
      </div>
      <div style={{ padding: "14px 20px 20px", flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {error && <p style={{ fontSize: 11, fontWeight: 600, color: "#CE2033", margin: 0 }}>{error}</p>}
        <button onClick={submit} disabled={loading || !selId} style={{
          padding: "14px", borderRadius: 14, border: "none",
          fontSize: 14, fontWeight: 800, background: accentColor, color: "#fff",
          opacity: loading || !selId ? 0.45 : 1, cursor: !selId ? "default" : "pointer",
        }}>
          {loading ? "Submitting…" : selected ? submitLabel(selected) : "Select a student first"}
        </button>
        <button onClick={onClose} style={{
          padding: "11px", borderRadius: 12, border: "1px solid #EAEAEA",
          background: "#FAFAFA", fontSize: 13, fontWeight: 600, color: "#999", cursor: "pointer",
        }}>Cancel</button>
      </div>
    </ModalShell>
  )
}

// ── Check-in modal (multi-step) ───────────────────────────────────────────────
interface ScheduleInfo {
  type:               string
  minutesRemaining:   number | null
  currentPeriodEndISO:string | null
  nextBlockEndISO:    string | null
}

function CheckInModal({ students, role, onClose }: {
  students: Student[]
  role:     string
  onClose:  () => void
}) {
  type Step = "student" | "location" | "success"
  const [step,            setStep]            = useState<Step>("student")
  const [selId,           setSelId]           = useState("")
  const [category,        setCategory]        = useState("")
  const [notes,           setNotes]           = useState("")
  const [extendNextBlock, setExtendNextBlock] = useState(false)
  const [schedInfo,       setSchedInfo]       = useState<ScheduleInfo | null>(null)
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState("")
  const [createdId,       setCreatedId]       = useState<string | null>(null)
  const [undoCountdown,   setUndoCountdown]   = useState<number | null>(null)
  const [undone,          setUndone]          = useState(false)

  const selected  = students.find(s => s.id === selId) ?? null
  const visibleCats = useMemo(() => categoriesForRole(role), [role])
  const generalCats   = visibleCats.filter(c => !c.sensitive)
  const sensitiveCats = visibleCats.filter(c => c.sensitive)

  // Fetch period info when modal opens
  useEffect(() => {
    fetch("/api/schedule/now")
      .then(r => r.json())
      .then(d => setSchedInfo(d))
      .catch(() => {})
  }, [])

  // Countdown timer for undo window
  useEffect(() => {
    if (undoCountdown === null) return
    if (undoCountdown <= 0) { setUndoCountdown(null); return }
    const t = setTimeout(() => setUndoCountdown(n => (n ?? 1) - 1), 1000)
    return () => clearTimeout(t)
  }, [undoCountdown])

  const showExtendPrompt =
    step === "location" &&
    schedInfo?.minutesRemaining !== null &&
    (schedInfo?.minutesRemaining ?? 999) < 10 &&
    !!schedInfo?.nextBlockEndISO

  async function submit() {
    if (!selId || !category) { setError("Select both a student and a location."); return }
    setLoading(true); setError("")

    let expiresAt: string | undefined
    if (schedInfo) {
      if (extendNextBlock && schedInfo.nextBlockEndISO) {
        expiresAt = schedInfo.nextBlockEndISO
      } else if (schedInfo.currentPeriodEndISO) {
        expiresAt = schedInfo.currentPeriodEndISO
      }
    }

    const res = await fetch("/api/check-ins", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        student_id:        selId,
        location_category: category,
        expires_at:        expiresAt,
        notes:             notes.trim() || null,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? "Something went wrong."); setLoading(false); return }

    setCreatedId(data.id)
    setUndoCountdown(300)  // 5 minutes
    setStep("success")
    setLoading(false)
  }

  async function undo() {
    if (!createdId) return
    setLoading(true)
    const res = await fetch(`/api/check-ins/${createdId}`, { method: "DELETE" })
    if (res.ok) {
      setUndone(true)
      setUndoCountdown(null)
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? "Could not undo.")
    }
    setLoading(false)
  }

  // ── Step: student selection ─────────────────────────────────────────────────
  if (step === "student") {
    return (
      <ModalShell onClose={onClose}>
        {/* flex:1 + minHeight:0 so the StudentPicker scroll list stays bounded and
            the footer button remains visible (was flexShrink:0). */}
        <div style={{ padding: "14px 20px 14px", flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          <p style={{ fontWeight: 800, fontSize: 15, color: "#166534", margin: "0 0 3px" }}>
            ✓ Student is with me
          </p>
          <p style={{ fontSize: 11, color: "#999", margin: "0 0 12px" }}>
            Select the student who is currently with you
          </p>
          <StudentPicker students={students} selectedId={selId} accentColor="#166534" onSelect={setSelId} />
        </div>
        <div style={{ padding: "14px 20px 20px", flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          <button onClick={() => { if (selId) setStep("location"); else setError("Please select a student.") }}
            disabled={!selId} style={{
              padding: "14px", borderRadius: 14, border: "none",
              fontSize: 14, fontWeight: 800, background: "#166534", color: "#fff",
              opacity: !selId ? 0.45 : 1, cursor: !selId ? "default" : "pointer",
            }}>
            {selId && selected
              ? `Continue with ${selected.call_by ?? selected.first_name ?? ""} ${selected.last_name ?? ""}`.trim()
              : "Select a student first"}
          </button>
          {error && <p style={{ fontSize: 11, fontWeight: 600, color: "#CE2033", margin: 0 }}>{error}</p>}
          <button onClick={onClose} style={{
            padding: "11px", borderRadius: 12, border: "1px solid #EAEAEA",
            background: "#FAFAFA", fontSize: 13, fontWeight: 600, color: "#999", cursor: "pointer",
          }}>Cancel</button>
        </div>
      </ModalShell>
    )
  }

  // ── Step: location picker ───────────────────────────────────────────────────
  if (step === "location") {
    return (
      <ModalShell onClose={onClose}>
        <div style={{ padding: "14px 20px", flexShrink: 0 }}>
          <button onClick={() => setStep("student")} style={{
            fontSize: 11, color: "#999", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 6,
          }}>← Back</button>
          <p style={{ fontWeight: 800, fontSize: 15, color: "#166534", margin: "0 0 2px" }}>Where are they?</p>
          <p style={{ fontSize: 11, color: "#999", margin: 0 }}>
            {selected ? `${selected.last_name}, ${selected.call_by ?? selected.first_name}` : ""}
          </p>
        </div>

        <div style={{ flex: 1, overflowY: "auto", minHeight: 0, overscrollBehavior: "contain", WebkitOverflowScrolling: "touch", padding: "0 20px 12px" }}>
          {/* General categories */}
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase",
                      color: "#3D3D3D", opacity: 0.4, margin: "10px 0 8px" }}>General</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {generalCats.map(cat => (
              <button key={cat.value} onClick={() => setCategory(cat.value)} style={{
                padding: "10px 12px", borderRadius: 12, border: "2px solid",
                borderColor: category === cat.value ? "#166534" : "#EAEAEA",
                background:  category === cat.value ? "#F0FDF4" : "#FAFAFA",
                cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ fontSize: 18 }}>{cat.emoji}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: category === cat.value ? "#166534" : "#3D3D3D" }}>
                  {cat.label}
                </span>
              </button>
            ))}
          </div>

          {/* Sensitive categories (role-filtered) */}
          {sensitiveCats.length > 0 && (
            <>
              <div style={{ height: 1, background: "#EAEAEA", margin: "14px 0 8px" }} />
              <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase",
                          color: "#3D3D3D", opacity: 0.4, margin: "0 0 8px" }}>Confidential</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {sensitiveCats.map(cat => (
                  <button key={cat.value} onClick={() => setCategory(cat.value)} style={{
                    padding: "10px 12px", borderRadius: 12, border: "2px solid",
                    borderColor: category === cat.value ? "#5B21B6" : "#EAEAEA",
                    background:  category === cat.value ? "#F5F3FF" : "#FAFAFA",
                    cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <span style={{ fontSize: 18 }}>{cat.emoji}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: category === cat.value ? "#5B21B6" : "#3D3D3D" }}>
                      {cat.label}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* < 10 min prompt */}
          {showExtendPrompt && (
            <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 12,
                          background: "#FFF8E0", border: "1px solid #F0C040" }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: "#8B6200", margin: "0 0 6px" }}>
                ⏰ Only {schedInfo?.minutesRemaining} min left in this period
              </p>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input type="checkbox" checked={extendNextBlock}
                  onChange={e => setExtendNextBlock(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: "pointer" }} />
                <span style={{ fontSize: 11, color: "#8B6200" }}>
                  Extend check-in through the next block
                </span>
              </label>
            </div>
          )}

          {/* Optional notes */}
          <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase",
                      color: "#3D3D3D", opacity: 0.4, margin: "14px 0 6px" }}>Notes (optional)</p>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="e.g. taking a test, picked up at 10:30…"
            rows={2}
            style={{
              width: "100%", padding: "8px 12px", borderRadius: 10,
              border: "1px solid #EAEAEA", background: "#FAFAFA",
              fontSize: 12, color: "#3D3D3D", outline: "none",
              resize: "none", boxSizing: "border-box",
            }} />
        </div>

        <div style={{ padding: "14px 20px 20px", flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {error && <p style={{ fontSize: 11, fontWeight: 600, color: "#CE2033", margin: 0 }}>{error}</p>}
          <button onClick={submit} disabled={loading || !category} style={{
            padding: "14px", borderRadius: 14, border: "none",
            fontSize: 14, fontWeight: 800, background: "#166534", color: "#fff",
            opacity: loading || !category ? 0.45 : 1, cursor: !category ? "default" : "pointer",
          }}>
            {loading ? "Checking in…" : "Confirm check-in"}
          </button>
          <button onClick={onClose} style={{
            padding: "11px", borderRadius: 12, border: "1px solid #EAEAEA",
            background: "#FAFAFA", fontSize: 13, fontWeight: 600, color: "#999", cursor: "pointer",
          }}>Cancel</button>
        </div>
      </ModalShell>
    )
  }

  // ── Step: success ───────────────────────────────────────────────────────────
  return (
    <ModalShell onClose={onClose}>
      <div style={{ padding: "30px 24px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
        <div style={{ fontSize: 40 }}>✅</div>
        <p style={{ fontWeight: 800, fontSize: 16, color: "#166534", margin: 0 }}>Check-in recorded</p>
        <p style={{ fontSize: 12, color: "#999", margin: 0 }}>
          {selected ? `${selected.call_by ?? selected.first_name ?? ""} ${selected.last_name ?? ""}`.trim() : ""} is checked in.
          {extendNextBlock ? " Extended through next block." : ""}
        </p>

        {error && <p style={{ fontSize: 11, fontWeight: 600, color: "#CE2033" }}>{error}</p>}

        {undone ? (
          <p style={{ fontSize: 12, fontWeight: 600, color: "#8B6200" }}>Check-in undone.</p>
        ) : undoCountdown !== null && undoCountdown > 0 ? (
          <button onClick={undo} disabled={loading} style={{
            padding: "10px 20px", borderRadius: 12, border: "1px solid #EAEAEA",
            background: "#FAFAFA", fontSize: 12, fontWeight: 600, color: "#999", cursor: "pointer",
          }}>
            Undo ({Math.floor(undoCountdown / 60)}:{String(undoCountdown % 60).padStart(2, "0")})
          </button>
        ) : null}

        <button onClick={onClose} style={{
          marginTop: 4, padding: "12px 28px", borderRadius: 14, border: "none",
          fontSize: 14, fontWeight: 800, background: "#166534", color: "#fff", cursor: "pointer",
        }}>Done</button>
      </div>
    </ModalShell>
  )
}

// ── QuickActionsPanel (main export) ──────────────────────────────────────────
export default function QuickActionsPanel({
  students,
  role = "staff",
  only,
}: {
  students:  Student[]
  role?:     string
  /** Limit to a single button: "welfare" | "missing" | "check_in" */
  only?:     "welfare" | "missing" | "check_in"
}) {
  const [welModal,     setWelModal]     = useState(false)
  const [missingModal, setMissingModal] = useState(false)
  const [checkInModal, setCheckInModal] = useState(false)

  const showWelfare  = only !== "missing"  && only !== "check_in"
  const showMissing  = only !== "welfare"  && only !== "check_in"
  const showCheckIn  = only !== "welfare"  && only !== "missing"

  return (
    <>
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#EAEAEA" }}>
        <div className="px-4 py-2.5 border-b" style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em]"
             style={{ color: "#3D3D3D", opacity: 0.45 }}>Quick Actions</p>
        </div>
        <div className="px-4 py-3 flex flex-col gap-2" style={{ background: "#fff" }}>

          {showWelfare && (
            <button onClick={() => setWelModal(true)}
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
            <button onClick={() => setMissingModal(true)}
              className="w-full rounded-xl px-4 py-3 flex items-center gap-3 text-left"
              style={{ background: "#FFF0F0", border: "2px solid #CE2033", cursor: "pointer" }}>
              <span className="text-lg">🔴</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold" style={{ color: "#A6192E" }}>Report a Missing Student</p>
                <p className="text-[10px]" style={{ color: "#CE2033", opacity: 0.8 }}>Open a missing-student case immediately</p>
              </div>
            </button>
          )}

          {showCheckIn && (
            <button onClick={() => setCheckInModal(true)}
              className="w-full rounded-xl px-4 py-3 flex items-center gap-3 text-left"
              style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", cursor: "pointer" }}>
              <span className="text-lg">✅</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold" style={{ color: "#166534" }}>Student is with me</p>
                <p className="text-[10px]" style={{ color: "#166534", opacity: 0.7 }}>Record student location — prevents false alarms</p>
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
          subtitle="Opens a missing-student case — you'll be taken to the coordinator view"
          apiEndpoint="/api/admin/report-missing"
          accentColor="#A6192E"
          submitLabel={s => `Report ${s.call_by ?? s.first_name ?? ""} ${s.last_name ?? ""} Missing`.trim()}
          students={students}
          onClose={() => setMissingModal(false)}
        />
      )}

      {checkInModal && (
        <CheckInModal
          students={students}
          role={role}
          onClose={() => setCheckInModal(false)}
        />
      )}
    </>
  )
}
