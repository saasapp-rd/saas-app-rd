"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export interface CourseRow {
  id:           string
  name:         string
  block_number: number | null
  room:         string | null
  is_advisory:  boolean
  is_active:    boolean
  teacher:      { display_name: string | null } | null
}

export interface TeacherOption {
  id:           string
  display_name: string | null
}

const BLOCKS = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const BLOCK_LABEL: Record<number, string> = {
  1: "1", 2: "2", 3: "3", 4: "4",
  5: "5", 6: "6", 7: "7", 8: "8",
  9: "Adv",
}

export default function CourseRowActions({
  course,
  teachers,
}: {
  course:   CourseRow
  teachers: TeacherOption[]
}) {
  const router = useRouter()

  const [open,           setOpen]           = useState(false)
  const [nameVal,        setNameVal]        = useState(course.name)
  const [blockVal,       setBlockVal]       = useState<number | null>(course.block_number)
  const [roomVal,        setRoomVal]        = useState(course.room ?? "")
  const [teacherIdVal,   setTeacherIdVal]   = useState(
    teachers.find(t => t.display_name === course.teacher?.display_name)?.id ?? ""
  )
  const [confirmDelete,  setConfirmDelete]  = useState(false)
  const [confirmPurge,   setConfirmPurge]   = useState(false)
  const [saving,         setSaving]         = useState(false)
  const [deactivating,   setDeactivating]   = useState(false)
  const [reactivating,   setReactivating]   = useState(false)
  const [deleting,       setDeleting]       = useState(false)
  const [error,          setError]          = useState("")

  const isActive    = course.is_active !== false
  const needsReview = course.block_number === null
  const blockLabel  = needsReview               ? "Needs Block"
                    : course.block_number === 9 ? "Advisory"
                    :                             `Block ${course.block_number}`

  function openPanel() {
    setOpen(true)
    setConfirmDelete(false)
    setConfirmPurge(false)
    setError("")
    setNameVal(course.name)
    setBlockVal(course.block_number)
    setRoomVal(course.room ?? "")
    setTeacherIdVal(
      teachers.find(t => t.display_name === course.teacher?.display_name)?.id ?? ""
    )
  }

  async function reactivate() {
    setReactivating(true); setError("")
    const res = await fetch("/api/admin/courses", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id: course.id, is_active: true }),
    })
    if (res.ok) { router.refresh() }
    else { const d = await res.json(); setError(d.error ?? "Failed."); setReactivating(false) }
  }

  async function saveDetails() {
    if (!nameVal.trim() || !blockVal) return
    setSaving(true); setError("")
    const res = await fetch("/api/admin/courses", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        id:           course.id,
        name:         nameVal.trim(),
        block_number: blockVal,
        room:         roomVal.trim() || null,
        teacher_id:   teacherIdVal || null,
      }),
    })
    if (res.ok) { router.refresh(); setOpen(false) }
    else { const d = await res.json(); setError(d.error ?? "Failed to update.") }
    setSaving(false)
  }

  async function deactivate() {
    setDeactivating(true); setError("")
    const res = await fetch("/api/admin/courses", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id: course.id, is_active: false }),
    })
    if (res.ok) { router.refresh() }
    else { const d = await res.json(); setError(d.error ?? "Failed.") }
    setDeactivating(false)
  }

  async function deleteCourse() {
    setDeleting(true); setError("")
    const res = await fetch("/api/admin/courses", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id: course.id }),
    })
    if (res.ok) { router.refresh() }
    else { const d = await res.json(); setError(d.error ?? "Failed to delete.") }
    setDeleting(false)
  }

  const borderColor = open         ? "#A6192E"
                    : needsReview  ? "#CE2033"
                    : !isActive    ? "#FECACA"
                    :                "#EAEAEA"
  const bgColor     = open         ? "#FFF8F8"
                    : needsReview  ? "#FFF0F0"
                    : !isActive    ? "#FFF5F5"
                    :                "#FAFAFA"
  const blockBadge  = needsReview              ? { bg: "#FEE2E2", color: "#CE2033" }
                    : course.block_number === 9 ? { bg: "#EEF6FF", color: "#1E5FA6" }
                    :                             { bg: "#EAEAEA", color: "#3D3D3D" }

  return (
    <div className="rounded-xl border overflow-hidden"
         style={{ borderColor }}>

      {/* Main row */}
      <div className="px-4 py-2.5 flex items-center justify-between"
           style={{ background: bgColor }}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold truncate"
                  style={{ color: isActive ? "#3D3D3D" : "#999" }}>
              {course.name}
            </span>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: blockBadge.bg, color: blockBadge.color }}>
              {blockLabel}
            </span>
            {needsReview && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase flex-shrink-0"
                    style={{ background: "#FEE2E2", color: "#CE2033" }}>
                Needs Review
              </span>
            )}
            {!isActive && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase flex-shrink-0"
                    style={{ background: "#FEE2E2", color: "#CE2033" }}>
                Inactive
              </span>
            )}
          </div>
          <div className="text-[10px] mt-0.5" style={{ color: "#999" }}>
            {course.teacher?.display_name ?? "No teacher"}
            {course.room ? ` · ${course.room}` : ""}
          </div>
        </div>

        <button
          onClick={() => open ? setOpen(false) : openPanel()}
          className="text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0 ml-3"
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

          {/* Reactivate banner */}
          {!isActive && (
            <div className="rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                 style={{ background: "#FFF0F0", border: "1px solid #FECACA" }}>
              <p className="text-xs font-semibold" style={{ color: "#CE2033" }}>
                This course is deactivated.
              </p>
              <button onClick={reactivate} disabled={reactivating}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white flex-shrink-0"
                style={{ background: "#166534", opacity: reactivating ? 0.5 : 1, border: "none", cursor: "pointer" }}>
                {reactivating ? "…" : "Reactivate"}
              </button>
            </div>
          )}

          {/* Course details */}
          <div>
            <label className="text-[9px] font-bold uppercase tracking-wide block mb-2"
                   style={{ color: "#3D3D3D", opacity: 0.5 }}>
              Course Details
            </label>
            <div className="flex flex-col gap-2">
              <input value={nameVal} onChange={e => setNameVal(e.target.value)}
                placeholder="Course name"
                className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                style={{ borderColor: "#EAEAEA", color: "#3D3D3D", background: "#FAFAFA" }} />

              <div>
                <p className="text-[9px] font-bold uppercase tracking-wide mb-1.5"
                   style={{ color: "#3D3D3D", opacity: 0.4 }}>Block</p>
                <div className="flex gap-1 flex-wrap">
                  {BLOCKS.map(b => (
                    <button key={b} type="button" onClick={() => setBlockVal(b)}
                      className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex-1 min-w-[2rem]"
                      style={{
                        background: blockVal === b ? (b === 9 ? "#1E5FA6" : "#A6192E") : "#F4F4F4",
                        color:      blockVal === b ? "#fff" : "#999",
                        border: "none", cursor: "pointer",
                      }}>
                      {BLOCK_LABEL[b]}
                    </button>
                  ))}
                </div>
              </div>

              <select value={teacherIdVal} onChange={e => setTeacherIdVal(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                style={{ borderColor: "#EAEAEA", color: teacherIdVal ? "#3D3D3D" : "#999", background: "#FAFAFA" }}>
                <option value="">No teacher assigned</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>{t.display_name}</option>
                ))}
              </select>

              <input value={roomVal} onChange={e => setRoomVal(e.target.value)}
                placeholder="Room (optional)"
                className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                style={{ borderColor: "#EAEAEA", color: "#3D3D3D", background: "#FAFAFA" }} />

              <button onClick={saveDetails}
                disabled={saving || !nameVal.trim() || !blockVal}
                className="w-full py-2 rounded-xl text-xs font-bold text-white"
                style={{
                  background: "#3D3D3D",
                  opacity: saving || !nameVal.trim() || !blockVal ? 0.4 : 1,
                  border: "none", cursor: "pointer",
                }}>
                {saving ? "Saving…" : "Save Details"}
              </button>
            </div>
          </div>

          <div style={{ borderTop: "1px solid #F0F0F0" }} />

          {/* Deactivate (active courses) */}
          {isActive && (
            <div>
              <label className="text-[9px] font-bold uppercase tracking-wide block mb-2"
                     style={{ color: "#CE2033", opacity: 0.7 }}>
                Remove Course
              </label>
              {!confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)}
                  className="w-full py-2 rounded-xl text-xs font-bold border"
                  style={{ borderColor: "#CE2033", color: "#CE2033", background: "#fff", cursor: "pointer" }}>
                  Deactivate {course.name}
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-bold text-center" style={{ color: "#CE2033" }}>
                    Remove {course.name}?
                  </p>
                  <button onClick={deactivate} disabled={deactivating}
                    className="w-full py-2 rounded-xl text-xs font-bold border"
                    style={{ borderColor: "#CE2033", color: "#CE2033", background: "#fff",
                             opacity: deactivating ? 0.5 : 1, cursor: "pointer" }}>
                    {deactivating ? "Deactivating…" : "Deactivate (hide from schedules)"}
                  </button>
                  <div style={{ borderTop: "1px solid #F0F0F0" }} />
                  <button onClick={deleteCourse} disabled={deleting}
                    className="w-full py-2 rounded-xl text-xs font-bold text-white"
                    style={{ background: "#7B0000", opacity: deleting ? 0.5 : 1,
                             border: "none", cursor: "pointer" }}>
                    {deleting ? "Deleting…" : "Delete permanently"}
                  </button>
                  <button onClick={() => setConfirmDelete(false)}
                    className="w-full py-2 rounded-xl text-xs font-bold"
                    style={{ background: "#EAEAEA", color: "#3D3D3D", border: "none", cursor: "pointer" }}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Permanent delete (inactive courses) */}
          {!isActive && (
            <div>
              <label className="text-[9px] font-bold uppercase tracking-wide block mb-2"
                     style={{ color: "#CE2033", opacity: 0.7 }}>
                Permanently Delete
              </label>
              {!confirmPurge ? (
                <button onClick={() => setConfirmPurge(true)}
                  className="w-full py-2 rounded-xl text-xs font-bold border"
                  style={{ borderColor: "#CE2033", color: "#CE2033", background: "#fff", cursor: "pointer" }}>
                  Delete {course.name} permanently
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-bold text-center" style={{ color: "#CE2033" }}>
                    Permanently delete {course.name}? Enrollments and incident references will be cleared.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={deleteCourse} disabled={deleting}
                      className="flex-1 py-2 rounded-xl text-xs font-bold text-white"
                      style={{ background: "#7B0000", opacity: deleting ? 0.5 : 1, border: "none", cursor: "pointer" }}>
                      {deleting ? "Deleting…" : "Yes, Delete"}
                    </button>
                    <button onClick={() => setConfirmPurge(false)}
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
