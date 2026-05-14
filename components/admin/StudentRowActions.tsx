"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { StudentRow } from "./StudentList"

const GRADES = [9, 10, 11, 12]

export default function StudentRowActions({ s }: { s: StudentRow }) {
  const router = useRouter()

  const [open,          setOpen]          = useState(false)
  const [lastNameVal,   setLastNameVal]   = useState(s.last_name   ?? "")
  const [firstNameVal,  setFirstNameVal]  = useState(s.first_name  ?? "")
  const [callByVal,     setCallByVal]     = useState(s.call_by     ?? "")
  const [gradeVal,      setGradeVal]      = useState<number | null>(s.grade)
  const [phoneVal,      setPhoneVal]      = useState(s.phone       ?? "")
  const [vcIdVal,       setVcIdVal]       = useState(s.veracross_id ?? "")
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [toggling,      setToggling]      = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const [error,         setError]         = useState("")

  const isActive     = s.is_active !== false
  const displayName  = [s.last_name, s.first_name].filter(Boolean).join(", ") || "Unknown"
  const preferred    = s.call_by && s.call_by !== s.first_name ? ` (${s.call_by})` : ""

  function openPanel() {
    setOpen(true)
    setConfirmDelete(false)
    setError("")
    // Reset fields to current values
    setLastNameVal(s.last_name   ?? "")
    setFirstNameVal(s.first_name ?? "")
    setCallByVal(s.call_by       ?? "")
    setGradeVal(s.grade)
    setPhoneVal(s.phone          ?? "")
    setVcIdVal(s.veracross_id    ?? "")
  }

  async function saveDetails() {
    if (!lastNameVal.trim() || !firstNameVal.trim() || !gradeVal) return
    setSaving(true); setError("")
    const res = await fetch("/api/admin/users", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        id:           s.id,
        last_name:    lastNameVal.trim(),
        first_name:   firstNameVal.trim(),
        call_by:      callByVal.trim() || firstNameVal.trim(),
        grade:        gradeVal,
        phone:        phoneVal.trim() || null,
        veracross_id: vcIdVal.trim() || null,
      }),
    })
    if (res.ok) { router.refresh(); setOpen(false) }
    else { const d = await res.json(); setError(d.error ?? "Failed to update.") }
    setSaving(false)
  }

  async function toggleActive() {
    setToggling(true); setError("")
    const res = await fetch("/api/admin/users", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id: s.id, is_active: !isActive }),
    })
    if (res.ok) { router.refresh() }
    else { const d = await res.json(); setError(d.error ?? "Failed.") }
    setToggling(false)
  }

  async function deleteStudent() {
    setDeleting(true); setError("")
    const res = await fetch("/api/admin/users", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id: s.id }),
    })
    if (res.ok) { router.refresh() }
    else { const d = await res.json(); setError(d.error ?? "Failed to delete.") }
    setDeleting(false)
  }

  return (
    <div className="rounded-xl border overflow-hidden"
         style={{ borderColor: open ? "#A6192E" : isActive ? "#EAEAEA" : "#FECACA" }}>

      {/* Main row */}
      <div className="px-3 py-2.5 flex items-center justify-between"
           style={{ background: open ? "#FFF8F8" : isActive ? "#FAFAFA" : "#FFF5F5",
                    opacity: isActive ? 1 : 0.6 }}>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold" style={{ color: "#3D3D3D" }}>
              {displayName}
              {preferred && (
                <span className="text-[10px] font-normal ml-1" style={{ color: "#999" }}>
                  {preferred}
                </span>
              )}
            </p>
            {!isActive && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase flex-shrink-0"
                    style={{ background: "#FEE2E2", color: "#CE2033" }}>
                Inactive
              </span>
            )}
          </div>
          <p className="text-[10px] mt-0.5" style={{ color: "#999" }}>
            {s.grade ? `Gr ${s.grade}` : "No grade"}
            {s.veracross_id && (
              <span> · <span style={{ fontFamily: "monospace" }}>ID {s.veracross_id}</span></span>
            )}
            {s.advisor_name && ` · ${s.advisor_name}`}
          </p>
        </div>

        <button
          onClick={() => open ? setOpen(false) : openPanel()}
          className="text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0 ml-2"
          style={{
            background: open ? "#A6192E" : "#EAEAEA",
            color:      open ? "#fff"    : "#3D3D3D",
            border: "none", cursor: "pointer",
          }}>
          {open ? "✕" : "Edit"}
        </button>
      </div>

      {/* Expanded panel */}
      {open && (
        <div className="px-4 py-3 border-t flex flex-col gap-4"
             style={{ background: "#fff", borderColor: "#EAEAEA" }}>

          {/* Reactivation banner */}
          {!isActive && (
            <div className="rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                 style={{ background: "#FFF0F0", border: "1px solid #FECACA" }}>
              <p className="text-xs font-semibold" style={{ color: "#CE2033" }}>
                This student is deactivated.
              </p>
              <button onClick={toggleActive} disabled={toggling}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white flex-shrink-0"
                style={{ background: "#166534", opacity: toggling ? 0.5 : 1, border: "none", cursor: "pointer" }}>
                {toggling ? "…" : "Reactivate"}
              </button>
            </div>
          )}

          {/* Student details */}
          <div>
            <label className="text-[9px] font-bold uppercase tracking-wide block mb-2"
                   style={{ color: "#3D3D3D", opacity: 0.5 }}>
              Student Details
            </label>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input value={lastNameVal} onChange={e => setLastNameVal(e.target.value)}
                  placeholder="Last name"
                  className="flex-1 px-3 py-2 rounded-xl text-sm border outline-none"
                  style={{ borderColor: "#EAEAEA", color: "#3D3D3D", background: "#FAFAFA" }} />
                <input value={firstNameVal} onChange={e => setFirstNameVal(e.target.value)}
                  placeholder="First name"
                  className="flex-1 px-3 py-2 rounded-xl text-sm border outline-none"
                  style={{ borderColor: "#EAEAEA", color: "#3D3D3D", background: "#FAFAFA" }} />
              </div>
              <input value={callByVal} onChange={e => setCallByVal(e.target.value)}
                placeholder="Preferred name (if different)"
                className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                style={{ borderColor: "#EAEAEA", color: "#3D3D3D", background: "#FAFAFA" }} />
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wide mb-1.5"
                   style={{ color: "#3D3D3D", opacity: 0.4 }}>Grade</p>
                <div className="flex gap-1.5">
                  {GRADES.map(g => (
                    <button key={g} type="button" onClick={() => setGradeVal(g)}
                      className="px-4 py-1.5 rounded-xl text-xs font-bold flex-1"
                      style={{
                        background: gradeVal === g ? "#A6192E" : "#F4F4F4",
                        color:      gradeVal === g ? "#fff"    : "#999",
                        border: "none", cursor: "pointer",
                      }}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <input value={phoneVal} onChange={e => setPhoneVal(e.target.value)}
                placeholder="Phone (optional)" type="tel"
                className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                style={{ borderColor: "#EAEAEA", color: "#3D3D3D", background: "#FAFAFA" }} />
              <input value={vcIdVal} onChange={e => setVcIdVal(e.target.value)}
                placeholder="Veracross ID (optional)"
                className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                style={{ borderColor: "#EAEAEA", color: "#3D3D3D", background: "#FAFAFA",
                         fontFamily: "monospace" }} />
              <div className="flex gap-2">
                <button onClick={saveDetails}
                  disabled={saving || !lastNameVal.trim() || !firstNameVal.trim() || !gradeVal}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-white"
                  style={{
                    background: "#3D3D3D",
                    opacity: saving || !lastNameVal.trim() || !firstNameVal.trim() || !gradeVal ? 0.4 : 1,
                    border: "none", cursor: "pointer",
                  }}>
                  {saving ? "Saving…" : "Save Details"}
                </button>
                <Link href={`/students/${s.id}`}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-center"
                  style={{
                    background: "#EEF6FF", color: "#1E5FA6",
                    textDecoration: "none", display: "block", lineHeight: "1.8",
                  }}>
                  View Profile →
                </Link>
              </div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid #F0F0F0" }} />

          {/* Deactivate */}
          {isActive && (
            <div>
              <label className="text-[9px] font-bold uppercase tracking-wide block mb-2"
                     style={{ color: "#CE2033", opacity: 0.7 }}>
                Remove Access
              </label>
              {!confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)}
                  className="w-full py-2 rounded-xl text-xs font-bold border"
                  style={{ borderColor: "#CE2033", color: "#CE2033", background: "#fff", cursor: "pointer" }}>
                  Deactivate {s.first_name}
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-bold text-center" style={{ color: "#CE2033" }}>
                    Remove {displayName}&apos;s access?
                  </p>
                  <div className="flex gap-2">
                    <button onClick={toggleActive} disabled={toggling}
                      className="flex-1 py-2 rounded-xl text-xs font-bold text-white"
                      style={{ background: "#CE2033", opacity: toggling ? 0.5 : 1, border: "none", cursor: "pointer" }}>
                      {toggling ? "Removing…" : "Yes, Deactivate"}
                    </button>
                    <button onClick={() => setConfirmDelete(false)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold"
                      style={{ background: "#EAEAEA", color: "#3D3D3D", border: "none", cursor: "pointer" }}>
                      Cancel
                    </button>
                  </div>
                  <div style={{ borderTop: "1px solid #F0F0F0", marginTop: 4 }} />
                  <p className="text-[9px] font-bold uppercase tracking-wide text-center"
                     style={{ color: "#CE2033", opacity: 0.6 }}>
                    Or permanently delete
                  </p>
                  <button onClick={deleteStudent} disabled={deleting}
                    className="w-full py-2 rounded-xl text-xs font-bold text-white"
                    style={{ background: "#7B0000", opacity: deleting ? 0.5 : 1, border: "none", cursor: "pointer" }}>
                    {deleting ? "Deleting…" : `Delete ${s.first_name} permanently`}
                  </button>
                </div>
              )}
            </div>
          )}

          {!isActive && (
            <div>
              <label className="text-[9px] font-bold uppercase tracking-wide block mb-2"
                     style={{ color: "#CE2033", opacity: 0.7 }}>
                Permanently Delete
              </label>
              {!confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)}
                  className="w-full py-2 rounded-xl text-xs font-bold border"
                  style={{ borderColor: "#CE2033", color: "#CE2033", background: "#fff", cursor: "pointer" }}>
                  Delete {s.first_name} permanently
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-bold text-center" style={{ color: "#CE2033" }}>
                    Permanently delete {displayName}? This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={deleteStudent} disabled={deleting}
                      className="flex-1 py-2 rounded-xl text-xs font-bold text-white"
                      style={{ background: "#7B0000", opacity: deleting ? 0.5 : 1, border: "none", cursor: "pointer" }}>
                      {deleting ? "Deleting…" : "Yes, Delete"}
                    </button>
                    <button onClick={() => setConfirmDelete(false)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold"
                      style={{ background: "#EAEAEA", color: "#3D3D3D", border: "none", cursor: "pointer" }}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="text-[10px] font-semibold text-center" style={{ color: "#CE2033" }}>
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
