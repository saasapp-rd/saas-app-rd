"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

const ALL_ROLES = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin",       label: "Admin"       },
  { value: "dean",        label: "Dean"        },
  { value: "coordinator", label: "Coordinator" },
  { value: "counselor",   label: "Counselor"   },
  { value: "teacher",     label: "Teacher"     },
  { value: "advisor",     label: "Advisor"     },
  { value: "staff",       label: "Staff"       },
  { value: "student",     label: "Student"     },
  { value: "parent",      label: "Parent"      },
]

const ROLE_PRIORITY = [
  "super_admin","admin","dean","coordinator","counselor","teacher","advisor","staff","student","parent",
]

function primaryRole(roles: string[]): string {
  for (const r of ROLE_PRIORITY) { if (roles.includes(r)) return r }
  return roles[0] ?? "staff"
}

const ROLE_STYLE: Record<string, { bg: string; color: string; selBg: string; selColor: string }> = {
  super_admin: { bg: "#F4F4F4", color: "#BABABA", selBg: "#FFF0F0", selColor: "#A6192E" },
  admin:       { bg: "#F4F4F4", color: "#BABABA", selBg: "#FFF0F0", selColor: "#A6192E" },
  dean:        { bg: "#F4F4F4", color: "#BABABA", selBg: "#FFF8E0", selColor: "#8B6200" },
  coordinator: { bg: "#F4F4F4", color: "#BABABA", selBg: "#EEF6FF", selColor: "#1E5FA6" },
  counselor:   { bg: "#F4F4F4", color: "#BABABA", selBg: "#F0FDF4", selColor: "#166534" },
  teacher:     { bg: "#F4F4F4", color: "#BABABA", selBg: "#EAEAEA", selColor: "#3D3D3D" },
  advisor:     { bg: "#F4F4F4", color: "#BABABA", selBg: "#EAEAEA", selColor: "#3D3D3D" },
  staff:       { bg: "#F4F4F4", color: "#BABABA", selBg: "#EAEAEA", selColor: "#3D3D3D" },
  student:     { bg: "#F4F4F4", color: "#BABABA", selBg: "#EAEAEA", selColor: "#3D3D3D" },
  parent:      { bg: "#F4F4F4", color: "#BABABA", selBg: "#EAEAEA", selColor: "#3D3D3D" },
}

// Badge style keyed by primary role
const BADGE_STYLE: Record<string, { bg: string; color: string }> = {
  super_admin: { bg: "#FFF0F0", color: "#A6192E" },
  admin:       { bg: "#FFF0F0", color: "#A6192E" },
  dean:        { bg: "#FFF8E0", color: "#8B6200" },
  coordinator: { bg: "#EEF6FF", color: "#1E5FA6" },
  counselor:   { bg: "#F0FDF4", color: "#166534" },
  teacher:     { bg: "#EAEAEA", color: "#3D3D3D" },
  advisor:     { bg: "#EAEAEA", color: "#3D3D3D" },
  staff:       { bg: "#EAEAEA", color: "#3D3D3D" },
  student:     { bg: "#EAEAEA", color: "#3D3D3D" },
  parent:      { bg: "#EAEAEA", color: "#3D3D3D" },
}

export interface Course {
  id:           string
  name:         string
  block_number: number
  room:         string | null
}

interface Props {
  id:          string
  displayName: string
  email:       string
  phone:       string | null
  role:        string
  roles?:      string[]
  isActive:    boolean
  isSelf:      boolean
  myCourses?:  Course[]
  allCourses?: Course[]
}

export default function UserRowActions({
  id, displayName, email, phone, role, roles: rolesProp, isActive, isSelf,
  myCourses, allCourses,
}: Props) {
  const router = useRouter()

  const [open,          setOpen]          = useState(false)
  const [savedRoles,    setSavedRoles]    = useState<string[]>(rolesProp?.length ? rolesProp : [role])
  const [pendingRoles,  setPendingRoles]  = useState<string[]>(rolesProp?.length ? rolesProp : [role])
  const [nameVal,       setNameVal]       = useState(displayName)
  const [emailVal,      setEmailVal]      = useState(email)
  const [phoneVal,      setPhoneVal]      = useState(phone ?? "")
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [savingDetails, setSavingDetails] = useState(false)
  const [savingRoles,   setSavingRoles]   = useState(false)
  const [error,         setError]         = useState("")

  const [courses,     setCourses]     = useState<Course[]>(myCourses ?? [])
  const [assignId,    setAssignId]    = useState("")
  const [assigning,   setAssigning]   = useState(false)
  const [unassigning, setUnassigning] = useState<string | null>(null)
  const [courseError, setCourseError] = useState("")

  const primary    = primaryRole(savedRoles)
  const badge      = BADGE_STYLE[primary] ?? BADGE_STYLE["staff"]
  const isTeach    = savedRoles.includes("teacher")
  const rolesChanged = JSON.stringify([...pendingRoles].sort()) !== JSON.stringify([...savedRoles].sort())

  const unassignedCourses = (allCourses ?? []).filter(c => !courses.find(mc => mc.id === c.id))

  function togglePendingRole(value: string) {
    setPendingRoles(prev => {
      if (prev.includes(value)) {
        if (prev.length === 1) return prev
        return prev.filter(r => r !== value)
      }
      return [...prev, value]
    })
  }

  async function saveDetails() {
    const trimName  = nameVal.trim()
    const trimEmail = emailVal.trim().toLowerCase()
    if (!trimName || !trimEmail) return
    setSavingDetails(true); setError("")
    const res = await fetch("/api/admin/users", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id, display_name: trimName, email: trimEmail, phone: phoneVal.trim() || null }),
    })
    if (res.ok) { router.refresh(); setOpen(false) }
    else { const d = await res.json(); setError(d.error ?? "Failed to update.") }
    setSavingDetails(false)
  }

  async function saveRoles() {
    if (!rolesChanged) return
    setSavingRoles(true); setError("")
    const res = await fetch("/api/admin/users", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id, roles: pendingRoles }),
    })
    if (res.ok) { setSavedRoles(pendingRoles); router.refresh(); setOpen(false) }
    else { const d = await res.json(); setError(d.error ?? "Failed to update roles.") }
    setSavingRoles(false)
  }

  async function setActiveState(active: boolean) {
    setSaving(true); setError("")
    const res = await fetch("/api/admin/users", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id, is_active: active }),
    })
    if (res.ok) { router.refresh() }
    else { const d = await res.json(); setError(d.error ?? "Failed."); setSaving(false) }
  }

  async function assignCourse() {
    if (!assignId) return
    setAssigning(true); setCourseError("")
    const course = (allCourses ?? []).find(c => c.id === assignId)
    const res = await fetch("/api/admin/courses", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id: assignId, teacher_id: id }),
    })
    if (res.ok) {
      if (course) setCourses(cs => [...cs, course].sort((a, b) => a.block_number - b.block_number))
      setAssignId("")
      router.refresh()
    } else {
      const d = await res.json()
      setCourseError(d.error ?? "Failed to assign.")
    }
    setAssigning(false)
  }

  async function unassignCourse(courseId: string) {
    setUnassigning(courseId); setCourseError("")
    const res = await fetch("/api/admin/courses", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id: courseId, teacher_id: null }),
    })
    if (res.ok) {
      setCourses(cs => cs.filter(c => c.id !== courseId))
      router.refresh()
    } else {
      const d = await res.json()
      setCourseError(d.error ?? "Failed to unassign.")
    }
    setUnassigning(null)
  }

  const coursesSummary = courses.length === 0
    ? "No courses assigned"
    : "Block" + (courses.length > 1 ? "s" : "") + " " +
      courses.map(c => c.block_number).join(", ") +
      " · " + courses.length + " course" + (courses.length !== 1 ? "s" : "")

  // Roles badge: show primary + a +N chip if multi-role
  const extraCount = savedRoles.length - 1

  return (
    <div className="rounded-xl border overflow-hidden"
         style={{ borderColor: open ? "#A6192E" : isActive ? "#EAEAEA" : "#FECACA" }}>

      {/* Main row */}
      <div className="px-4 py-2.5 flex items-center justify-between"
           style={{ background: open ? "#FFF8F8" : isActive ? "#FAFAFA" : "#FFF5F5" }}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <div className="text-sm font-semibold truncate" style={{ color: isActive ? "#3D3D3D" : "#999" }}>
              {displayName}
            </div>
            {!isActive && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase flex-shrink-0"
                    style={{ background: "#FEE2E2", color: "#CE2033" }}>
                Inactive
              </span>
            )}
          </div>
          <div className="text-[10px] truncate" style={{ color: "#999" }}>{email}</div>
          {phone && (
            <div className="text-[10px] truncate" style={{ color: "#BABABA" }}>{phone}</div>
          )}
          {isTeach && (
            <div className="text-[10px] truncate mt-0.5"
                 style={{ color: courses.length > 0 ? "#A6192E" : "#BABABA" }}>
              {coursesSummary}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase"
                  style={{ background: badge.bg, color: badge.color }}>
              {primary.replace("_", " ")}
            </span>
            {extraCount > 0 && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: "#EAEAEA", color: "#999" }}>
                +{extraCount}
              </span>
            )}
          </div>
          <button
            onClick={() => { setOpen(o => !o); setConfirmDelete(false); setError(""); setCourseError(""); setPendingRoles(savedRoles) }}
            className="text-[10px] font-bold px-2 py-1 rounded-lg"
            style={{
              background: open ? "#A6192E" : "#EAEAEA",
              color:      open ? "#fff"    : "#3D3D3D",
              border: "none", cursor: "pointer",
            }}>
            {open ? "✕" : "Edit"}
          </button>
        </div>
      </div>

      {/* Expanded edit panel */}
      {open && (
        <div className="px-4 py-3 border-t flex flex-col gap-4"
             style={{ background: "#fff", borderColor: "#EAEAEA" }}>

          {/* Reactivate banner */}
          {!isActive && (
            <div className="rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                 style={{ background: "#FFF0F0", border: "1px solid #FECACA" }}>
              <p className="text-xs font-semibold" style={{ color: "#CE2033" }}>
                This account is deactivated.
              </p>
              <button
                onClick={() => setActiveState(true)}
                disabled={saving}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white flex-shrink-0"
                style={{ background: "#166534", opacity: saving ? 0.5 : 1, border: "none", cursor: "pointer" }}>
                {saving ? "…" : "Reactivate"}
              </button>
            </div>
          )}

          {/* Courses (teachers only) */}
          {isTeach && (
            <div>
              <label className="text-[9px] font-bold uppercase tracking-wide block mb-2"
                     style={{ color: "#3D3D3D", opacity: 0.5 }}>
                Courses
              </label>

              {courses.length === 0 ? (
                <p className="text-[10px] mb-2" style={{ color: "#999" }}>No courses assigned yet.</p>
              ) : (
                <div className="flex flex-col gap-1 mb-2">
                  {courses.map(c => (
                    <div key={c.id}
                         className="flex items-center justify-between px-3 py-2 rounded-xl"
                         style={{ background: "#FAFAFA", border: "1px solid #EAEAEA" }}>
                      <div>
                        <span className="text-xs font-semibold" style={{ color: "#3D3D3D" }}>
                          {c.name}
                        </span>
                        <span className="ml-2 text-[10px]" style={{ color: "#999" }}>
                          Block {c.block_number}{c.room ? ` · ${c.room}` : ""}
                        </span>
                      </div>
                      <button
                        onClick={() => unassignCourse(c.id)}
                        disabled={unassigning === c.id}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-lg"
                        style={{
                          background: "#FFF0F0", color: "#CE2033",
                          border: "none", cursor: "pointer",
                          opacity: unassigning === c.id ? 0.5 : 1,
                        }}>
                        {unassigning === c.id ? "…" : "Remove"}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {unassignedCourses.length > 0 && (
                <div className="flex gap-2">
                  <select
                    value={assignId}
                    onChange={e => setAssignId(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl text-sm border outline-none"
                    style={{ borderColor: "#EAEAEA", color: assignId ? "#3D3D3D" : "#999", background: "#FAFAFA" }}>
                    <option value="">Assign a course…</option>
                    {unassignedCourses.map(c => (
                      <option key={c.id} value={c.id}>
                        Block {c.block_number} — {c.name}{c.room ? ` (${c.room})` : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={assignCourse}
                    disabled={assigning || !assignId}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-white flex-shrink-0"
                    style={{
                      background: "#3D3D3D",
                      opacity: assigning || !assignId ? 0.4 : 1,
                      border: "none", cursor: !assignId ? "default" : "pointer",
                    }}>
                    {assigning ? "…" : "Assign"}
                  </button>
                </div>
              )}

              {unassignedCourses.length === 0 && courses.length > 0 && (
                <p className="text-[10px]" style={{ color: "#999" }}>
                  All active courses are assigned to this teacher.
                </p>
              )}

              {courseError && (
                <p className="text-[10px] font-semibold mt-1" style={{ color: "#CE2033" }}>{courseError}</p>
              )}
            </div>
          )}

          {isTeach && <div style={{ borderTop: "1px solid #F0F0F0" }} />}

          {/* Contact Details */}
          <div>
            <label className="text-[9px] font-bold uppercase tracking-wide block mb-2"
                   style={{ color: "#3D3D3D", opacity: 0.5 }}>
              Contact Details
            </label>
            <div className="flex flex-col gap-2">
              <input value={nameVal} onChange={e => setNameVal(e.target.value)}
                placeholder="Display name"
                className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                style={{ borderColor: "#EAEAEA", color: "#3D3D3D", background: "#FAFAFA" }} />
              <input value={emailVal} onChange={e => setEmailVal(e.target.value)}
                placeholder="Email address" type="email"
                className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                style={{ borderColor: "#EAEAEA", color: "#3D3D3D", background: "#FAFAFA" }} />
              <input value={phoneVal} onChange={e => setPhoneVal(e.target.value)}
                placeholder="Phone number (optional)" type="tel"
                className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                style={{ borderColor: "#EAEAEA", color: "#3D3D3D", background: "#FAFAFA" }} />
              <button onClick={saveDetails}
                disabled={savingDetails || !nameVal.trim() || !emailVal.trim()}
                className="w-full py-2 rounded-xl text-xs font-bold text-white"
                style={{
                  background: "#3D3D3D",
                  opacity: savingDetails || !nameVal.trim() || !emailVal.trim() ? 0.4 : 1,
                  border: "none", cursor: "pointer",
                }}>
                {savingDetails ? "Saving…" : "Save Details"}
              </button>
            </div>
          </div>

          <div style={{ borderTop: "1px solid #F0F0F0" }} />

          {/* Roles */}
          <div>
            <label className="text-[9px] font-bold uppercase tracking-wide block mb-2"
                   style={{ color: "#3D3D3D", opacity: 0.5 }}>
              Roles
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {ALL_ROLES.map(r => {
                const sel = pendingRoles.includes(r.value)
                const s   = ROLE_STYLE[r.value] ?? ROLE_STYLE["staff"]
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => togglePendingRole(r.value)}
                    className="px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors"
                    style={{
                      background: sel ? s.selBg    : s.bg,
                      color:      sel ? s.selColor : s.color,
                      border:     sel ? `1.5px solid ${s.selColor}` : "1.5px solid transparent",
                      cursor:     "pointer",
                    }}>
                    {r.label}
                  </button>
                )
              })}
            </div>
            {rolesChanged && (
              <button onClick={saveRoles}
                disabled={savingRoles}
                className="w-full py-2 rounded-xl text-xs font-bold text-white"
                style={{ background: "#3D3D3D", opacity: savingRoles ? 0.4 : 1, border: "none", cursor: "pointer" }}>
                {savingRoles ? "Saving…" : "Save Roles"}
              </button>
            )}
          </div>

          <div style={{ borderTop: "1px solid #F0F0F0" }} />

          {/* Deactivate */}
          {isActive && (
            <div>
              <label className="text-[9px] font-bold uppercase tracking-wide block mb-2"
                     style={{ color: "#CE2033", opacity: 0.7 }}>
                Remove Access
              </label>
              {isSelf ? (
                <p className="text-[10px]" style={{ color: "#999" }}>
                  You cannot deactivate your own account.
                </p>
              ) : !confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)}
                  className="w-full py-2 rounded-xl text-xs font-bold border"
                  style={{ borderColor: "#CE2033", color: "#CE2033", background: "#fff", cursor: "pointer" }}>
                  Deactivate {displayName.split(" ")[0]}
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-bold text-center" style={{ color: "#CE2033" }}>
                    Remove {displayName}&apos;s access? This cannot be easily undone.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setActiveState(false)} disabled={saving}
                      className="flex-1 py-2 rounded-xl text-xs font-bold text-white"
                      style={{ background: "#CE2033", opacity: saving ? 0.5 : 1, border: "none", cursor: "pointer" }}>
                      {saving ? "Removing…" : "Yes, Remove"}
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
