"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import type { StudentRow, EnrollmentRow } from "./StudentList"
import { analyzeSchedule } from "./StudentList"

const GRADES = [9, 10, 11, 12]

type Mode = "none" | "view" | "edit"

export default function StudentRowActions({
  s,
  enrollments = [],
}: {
  s:           StudentRow
  enrollments?: EnrollmentRow[]
}) {
  const router = useRouter()

  const [mode,          setMode]          = useState<Mode>("none")
  const [lastNameVal,   setLastNameVal]   = useState(s.last_name   ?? "")
  const [firstNameVal,  setFirstNameVal]  = useState(s.first_name  ?? "")
  const [callByVal,     setCallByVal]     = useState(s.call_by     ?? "")
  const [gradeVal,      setGradeVal]      = useState<number | null>(s.grade)
  const [phoneVal,      setPhoneVal]      = useState(s.phone       ?? "")
  const [vcIdVal,       setVcIdVal]       = useState(s.veracross_id ?? "")
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [toggling,      setToggling]      = useState(false)
  const [acking,        setAcking]        = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const [error,         setError]         = useState("")

  const isActive     = s.is_active !== false
  const displayName  = [s.last_name, s.first_name].filter(Boolean).join(", ") || "Unknown"
  const preferred    = s.call_by && s.call_by !== s.first_name ? ` (${s.call_by})` : ""
  // Only flag schedule issues for active students — inactive students often
  // have intentionally incomplete enrollments.
  const scheduleStatus = isActive ? analyzeSchedule(enrollments) : { hasIssues: false, missingBlocks: [], missingAdvisory: false, overlays: [] }
  const acknowledged   = !!s.schedule_acknowledged
  // Three states: clean / unacknowledged issues (red) / acknowledged variant (orange)
  const issueState: "clean" | "open" | "acknowledged" =
    !scheduleStatus.hasIssues ? "clean"
      : acknowledged          ? "acknowledged"
      :                         "open"

  function toggleView() {
    if (mode === "edit") return
    setMode(mode === "view" ? "none" : "view")
  }

  function toggleEdit() {
    if (mode === "edit") {
      setMode("none")
      setConfirmDelete(false)
      setError("")
    } else {
      // Reset edit fields to current values when opening
      setLastNameVal(s.last_name   ?? "")
      setFirstNameVal(s.first_name ?? "")
      setCallByVal(s.call_by       ?? "")
      setGradeVal(s.grade)
      setPhoneVal(s.phone          ?? "")
      setVcIdVal(s.veracross_id    ?? "")
      setConfirmDelete(false)
      setError("")
      setMode("edit")
    }
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
    if (res.ok) { router.refresh(); setMode("none") }
    else { const d = await res.json(); setError(d.error ?? "Failed to update.") }
    setSaving(false)
  }

  async function toggleAcknowledged() {
    setAcking(true); setError("")
    const res = await fetch("/api/admin/users", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id: s.id, schedule_acknowledged: !acknowledged }),
    })
    if (res.ok) { router.refresh() }
    else { const d = await res.json(); setError(d.error ?? "Failed.") }
    setAcking(false)
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

  const borderColor = mode !== "none"           ? "#A6192E"
                    : issueState === "open"     ? "#CE2033"
                    : issueState === "acknowledged" ? "#F0A030"
                    : !isActive                 ? "#FECACA"
                    :                             "#EAEAEA"
  const bgColor     = mode !== "none"           ? "#FFF8F8"
                    : issueState === "open"     ? "#FFF0F0"
                    : issueState === "acknowledged" ? "#FFF8E0"
                    : !isActive                 ? "#FFF5F5"
                    :                             "#FAFAFA"

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor }}>

      {/* Main row */}
      <div className="px-3 py-2.5 flex items-center justify-between"
           style={{ background: bgColor, opacity: isActive ? 1 : 0.6 }}>

        <div onClick={toggleView}
             className="min-w-0 flex-1"
             style={{ cursor: mode === "edit" ? "default" : "pointer" }}>
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
            {issueState === "open" && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase flex-shrink-0"
                    style={{ background: "#FEE2E2", color: "#CE2033" }}>
                ⚠ Schedule
              </span>
            )}
            {issueState === "acknowledged" && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase flex-shrink-0"
                    style={{ background: "#FFF1D6", color: "#A06000" }}
                    title="Schedule is a known-OK variant — admin has acknowledged it.">
                ✓ Variant OK
              </span>
            )}
          </div>
          <p className="text-[10px] mt-0.5" style={{ color: "#999" }}>
            {s.grade ? `Gr ${s.grade}` : "No grade"}
            {s.veracross_id && (
              <span> · <span style={{ fontFamily: "monospace" }}>ID {s.veracross_id}</span></span>
            )}
            {s.advisor_name && ` · ${s.advisor_name}`}
            {enrollments.length > 0 && ` · ${enrollments.length} ${enrollments.length === 1 ? "class" : "classes"}`}
          </p>
        </div>

        {/* Close (✕) button — only visible in edit mode, so admin can
            bail out without saving. View/none modes keep the row clean;
            entry into edit happens via the "Edit details" button in the
            view panel below. */}
        {mode === "edit" && (
          <button onClick={toggleEdit}
            className="text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0 ml-2"
            style={{
              background: "#A6192E", color: "#fff",
              border: "none", cursor: "pointer",
            }}>
            ✕
          </button>
        )}
      </div>

      {/* View panel */}
      {mode === "view" && (
        <div className="px-4 py-3 border-t"
             style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
          <dl className="grid gap-x-3 gap-y-1.5 text-xs"
              style={{ gridTemplateColumns: "auto 1fr" }}>
            <ViewField label="Last / First"
                       value={[s.last_name, s.first_name].filter(Boolean).join(" / ") || "—"} />
            {s.call_by && s.call_by !== s.first_name && (
              <ViewField label="Preferred" value={s.call_by} />
            )}
            <ViewField label="Grade" value={s.grade ? `Grade ${s.grade}` : "—"} />
            {s.phone && <ViewField label="Phone" value={s.phone} />}
            {s.advisor_name && <ViewField label="Advisor" value={s.advisor_name} />}
            {s.veracross_id && (
              <ViewField label="Veracross ID" value={s.veracross_id} mono />
            )}
            <ViewField label="Account ID" value={s.id} mono dim />
            <ViewField label="Status" value={isActive ? "Active" : "Deactivated"} />
          </dl>

          {/* Schedule issues callout */}
          {scheduleStatus.hasIssues && (
            <div className="mt-3 rounded-xl px-3 py-2"
                 style={{
                   background: issueState === "acknowledged" ? "#FFF8E0" : "#FFF0F0",
                   border:     issueState === "acknowledged" ? "1px solid #FDE68A" : "1px solid #FECACA",
                 }}>
              <p className="text-[9px] font-bold uppercase tracking-wide mb-1"
                 style={{ color: issueState === "acknowledged" ? "#A06000" : "#CE2033" }}>
                {issueState === "acknowledged" ? "✓ Known-OK Variant" : "⚠ Schedule Issues"}
              </p>
              {scheduleStatus.missingBlocks.length > 0 && (
                <p className="text-[10px]" style={{ color: issueState === "acknowledged" ? "#A06000" : "#CE2033" }}>
                  Missing block{scheduleStatus.missingBlocks.length === 1 ? "" : "s"}:{" "}
                  {scheduleStatus.missingBlocks.join(", ")}
                </p>
              )}
              {scheduleStatus.missingAdvisory && (
                <p className="text-[10px]" style={{ color: issueState === "acknowledged" ? "#A06000" : "#CE2033" }}>
                  No advisory enrollment
                </p>
              )}
              {scheduleStatus.overlays.length > 0 && (
                <p className="text-[10px]" style={{ color: issueState === "acknowledged" ? "#A06000" : "#CE2033" }}>
                  Multiple classes in block{scheduleStatus.overlays.length === 1 ? "" : "s"}:{" "}
                  {scheduleStatus.overlays.join(", ")}
                </p>
              )}
              <button onClick={toggleAcknowledged} disabled={acking}
                className="mt-2 text-[10px] font-bold px-2.5 py-1 rounded-lg"
                style={{
                  background: issueState === "acknowledged" ? "#fff" : "#FFF1D6",
                  color:      issueState === "acknowledged" ? "#A06000" : "#A06000",
                  border:     issueState === "acknowledged" ? "1px solid #FDE68A" : "1px solid #FDE68A",
                  cursor: "pointer", opacity: acking ? 0.5 : 1,
                }}>
                {acking
                  ? "…"
                  : issueState === "acknowledged"
                    ? "Un-acknowledge variant"
                    : "Mark as known-OK variant"}
              </button>
            </div>
          )}

          {/* Course enrollments */}
          <div className="mt-3">
            <p className="text-[9px] font-bold uppercase tracking-wide mb-1.5"
               style={{ color: "#3D3D3D", opacity: 0.5 }}>
              Course Enrollments {enrollments.length > 0 ? `(${enrollments.length})` : ""}
            </p>
            {enrollments.length === 0 ? (
              <p className="text-[10px]" style={{ color: "#999" }}>
                No enrollments. Run the Student Enrollments import or assign manually.
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {enrollments.map((e, i) => (
                  <div key={`${e.block}-${e.courseName}-${i}`}
                       className="flex items-baseline gap-2 px-2 py-1 rounded"
                       style={{ background: "#fff" }}>
                    <span className="text-[10px] font-bold flex-shrink-0"
                          style={{
                            color: e.block == null ? "#CE2033"
                                 : e.isAdvisory    ? "#1E5FA6"
                                 :                   "#999",
                            minWidth: "44px",
                          }}>
                      {e.block == null   ? "TBD"
                       : e.isAdvisory    ? "Adv"
                       :                   `Blk ${e.block}`}
                    </span>
                    <span className="text-xs flex-1 truncate" style={{ color: "#3D3D3D" }}>
                      {e.courseName}
                    </span>
                    {e.room && (
                      <span className="text-[10px] flex-shrink-0" style={{ color: "#BABABA" }}>
                        {e.room}
                      </span>
                    )}
                    {e.teacherName && (
                      <span className="text-[10px] flex-shrink-0" style={{ color: "#999" }}>
                        {e.teacherName}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3 flex justify-end gap-2">
            <button onClick={toggleEdit}
              className="text-[10px] font-semibold px-3 py-1.5 rounded-lg"
              style={{
                background: "#EAEAEA", color: "#3D3D3D",
                border: "none", cursor: "pointer",
              }}>
              Edit details
            </button>
            <Link href={`/students/${s.id}`}
              className="text-[10px] font-bold px-3 py-1.5 rounded-lg"
              style={{ background: "#A6192E", color: "#fff", textDecoration: "none" }}>
              Edit Schedule →
            </Link>
          </div>
        </div>
      )}

      {/* Edit panel */}
      {mode === "edit" && (
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

function ViewField({ label, value, mono, dim }: {
  label: string
  value: string
  mono?: boolean
  dim?: boolean
}) {
  return (
    <>
      <dt style={{ color: "#999" }}>{label}</dt>
      <dd style={{
        color:      dim ? "#999" : "#3D3D3D",
        fontFamily: mono ? "monospace" : undefined,
        fontSize:   mono ? "11px" : undefined,
        wordBreak:  mono ? "break-all" : undefined,
      }}>
        {value}
      </dd>
    </>
  )
}
