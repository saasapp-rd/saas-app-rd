"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

const ALL_ROLES = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin",       label: "Administrator" },
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

const DEAN_GRADE_OPTIONS = [9, 10, 11, 12]

export interface Course {
  id:           string
  name:         string
  block_number: number
  room:         string | null
}

interface Props {
  id:             string
  displayName:    string
  firstName?:     string | null
  lastName?:      string | null
  email:          string
  phone:          string | null
  businessPhone?: string | null
  role:           string
  roles?:         string[]
  isActive:       boolean
  isSelf:         boolean
  veracrossId?:   string | null
  deanGrades?:    number[] | null
  jobTitle?:      string | null
  myCourses?:     Course[]
  allCourses?:    Course[]
  defaultOpen?:   boolean
}

type Mode = "none" | "view" | "edit"

export default function UserRowActions({
  id, displayName, firstName, lastName, email, phone, businessPhone,
  role, roles: rolesProp, isActive, isSelf,
  veracrossId, deanGrades, jobTitle,
  myCourses, allCourses, defaultOpen,
}: Props) {
  const router = useRouter()

  const [mode,             setMode]             = useState<Mode>(defaultOpen ? "edit" : "none")
  const [savedRoles,       setSavedRoles]       = useState<string[]>(rolesProp?.length ? rolesProp : [role])
  const [pendingRoles,     setPendingRoles]     = useState<string[]>(rolesProp?.length ? rolesProp : [role])
  const [nameVal,          setNameVal]          = useState(displayName)
  const [emailVal,         setEmailVal]         = useState(email)
  const [phoneVal,         setPhoneVal]         = useState(phone ?? "")
  const [businessPhoneVal, setBusinessPhoneVal] = useState(businessPhone ?? "")
  const [vcIdVal,          setVcIdVal]          = useState(veracrossId ?? "")
  const [editingVcId,      setEditingVcId]      = useState(false)
  const [confirmEditVcId,  setConfirmEditVcId]  = useState(false)
  const [deanGradesVal,    setDeanGradesVal]    = useState<number[]>(deanGrades ?? [])
  const [confirmDelete,    setConfirmDelete]    = useState(false)
  const [confirmPurge,     setConfirmPurge]     = useState(false)
  const [saving,           setSaving]           = useState(false)
  const [savingDetails,    setSavingDetails]    = useState(false)
  const [savingRoles,      setSavingRoles]      = useState(false)
  const [deleting,         setDeleting]         = useState(false)
  const [error,            setError]            = useState("")

  const [courses,     setCourses]     = useState<Course[]>(myCourses ?? [])
  const [assignId,    setAssignId]    = useState("")
  const [assigning,   setAssigning]   = useState(false)
  const [unassigning, setUnassigning] = useState<string | null>(null)
  const [courseError, setCourseError] = useState("")

  const primary      = primaryRole(savedRoles)
  const badge        = BADGE_STYLE[primary] ?? BADGE_STYLE["staff"]
  const isTeach      = savedRoles.includes("teacher")
  const isDean       = savedRoles.includes("dean")
  const isPendingDean = pendingRoles.includes("dean")
  const rolesChanged = JSON.stringify([...pendingRoles].sort()) !== JSON.stringify([...savedRoles].sort())
  const unassignedCourses = (allCourses ?? []).filter(c => !courses.find(mc => mc.id === c.id))

  function toggleView() {
    if (mode === "edit") return  // don't interrupt editing
    setMode(mode === "view" ? "none" : "view")
  }

  function toggleEdit() {
    if (mode === "edit") {
      setMode("none")
      setEditingVcId(false)
      setConfirmEditVcId(false)
      setConfirmDelete(false)
      setConfirmPurge(false)
      setError("")
      setCourseError("")
      setPendingRoles(savedRoles)
    } else {
      setMode("edit")
      setConfirmDelete(false)
      setConfirmPurge(false)
      setError("")
      setCourseError("")
      setPendingRoles(savedRoles)
    }
  }

  function togglePendingRole(value: string) {
    setPendingRoles(prev => {
      if (prev.includes(value)) {
        if (prev.length === 1) return prev
        return prev.filter(r => r !== value)
      }
      return [...prev, value]
    })
  }

  function toggleDeanGrade(g: number) {
    setDeanGradesVal(prev =>
      prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g].sort((a, b) => a - b)
    )
  }

  async function saveDetails() {
    const trimName  = nameVal.trim()
    const trimEmail = emailVal.trim().toLowerCase()
    if (!trimName || !trimEmail) return
    setSavingDetails(true); setError("")
    const body: Record<string, unknown> = {
      id,
      display_name:   trimName,
      email:          trimEmail,
      phone:          phoneVal.trim() || null,
      business_phone: businessPhoneVal.trim() || null,
    }
    if (editingVcId) body.veracross_id = vcIdVal.trim() || null
    if (isPendingDean) body.dean_grades = deanGradesVal
    const res = await fetch("/api/admin/users", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    })
    if (res.ok) {
      router.refresh()
      setMode("none")
      setEditingVcId(false)
      setConfirmEditVcId(false)
    } else {
      const d = await res.json()
      setError(d.error ?? "Failed to update.")
    }
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
    if (res.ok) { setSavedRoles(pendingRoles); router.refresh() }
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

  async function deleteUser() {
    setDeleting(true); setError("")
    const res = await fetch("/api/admin/users", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id }),
    })
    if (res.ok) { router.refresh() }
    else { const d = await res.json(); setError(d.error ?? "Failed to delete."); setDeleting(false) }
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

  const extraCount  = savedRoles.length - 1
  const phoneLabel  = (phone && businessPhone) ? "Mobile" : "Phone"

  return (
    <div className="rounded-xl border overflow-hidden"
         style={{ borderColor: mode !== "none" ? "#A6192E" : isActive ? "#EAEAEA" : "#FECACA" }}>

      {/* Main row */}
      <div className="px-4 py-2.5 flex items-center justify-between"
           style={{ background: mode !== "none" ? "#FFF8F8" : isActive ? "#FAFAFA" : "#FFF5F5" }}>
        <div onClick={toggleView}
             className="min-w-0 flex-1"
             style={{ cursor: mode === "edit" ? "default" : "pointer" }}>
          <div className="flex items-center gap-1.5">
            <div className="text-sm font-semibold truncate"
                 style={{ color: isActive ? "#3D3D3D" : "#999" }}>
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
            <div className="text-[10px] truncate" style={{ color: "#BABABA" }}>
              {phoneLabel}: {phone}{businessPhone ? ` · Business: ${businessPhone}` : ""}
            </div>
          )}
          {!phone && businessPhone && (
            <div className="text-[10px] truncate" style={{ color: "#BABABA" }}>
              Business: {businessPhone}
            </div>
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
              {primary === "admin" ? "Administrator" : primary.replace("_", " ")}
            </span>
            {extraCount > 0 && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: "#EAEAEA", color: "#999" }}>
                +{extraCount}
              </span>
            )}
          </div>
          <button
            onClick={toggleEdit}
            className="text-[10px] font-bold px-2 py-1 rounded-lg"
            style={{
              background: mode === "edit" ? "#A6192E" : "#EAEAEA",
              color:      mode === "edit" ? "#fff"    : "#3D3D3D",
              border: "none", cursor: "pointer",
            }}>
            {mode === "edit" ? "✕" : "Edit"}
          </button>
        </div>
      </div>

      {/* View panel — full read-only details */}
      {mode === "view" && (
        <div className="px-4 py-3 border-t"
             style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
          <dl className="grid gap-x-3 gap-y-1.5 text-xs"
              style={{ gridTemplateColumns: "auto 1fr" }}>
            <ViewField label="Display name" value={displayName} />
            {(firstName || lastName) && (
              <ViewField label="First / Last"
                         value={[firstName, lastName].filter(Boolean).join(" / ")} />
            )}
            <ViewField label="Email" value={email} />
            {phone && <ViewField label={businessPhone ? "Mobile phone" : "Phone"} value={phone} />}
            {businessPhone && <ViewField label="Business phone" value={businessPhone} />}
            {jobTitle && <ViewField label="Job title" value={jobTitle} />}
            <ViewField label={`Role${savedRoles.length > 1 ? "s" : ""}`}
                       value={savedRoles.map(r => r === "admin" ? "Administrator" : r === "super_admin" ? "Super Admin" : r[0].toUpperCase() + r.slice(1)).join(", ")} />
            {isDean && (
              <ViewField label="Grade levels"
                         value={(deanGrades && deanGrades.length > 0) ? deanGrades.join(", ") : "—"} />
            )}
            {isTeach && courses.length > 0 && (
              <ViewField label="Courses" value={coursesSummary} />
            )}
            {veracrossId && (
              <ViewField label="Veracross ID" value={veracrossId} mono />
            )}
            <ViewField label="Account ID" value={id} mono dim />
            <ViewField label="Status" value={isActive ? "Active" : "Deactivated"} />
          </dl>
          <div className="mt-3 flex justify-end">
            <button onClick={toggleEdit}
              className="text-[10px] font-bold px-3 py-1.5 rounded-lg"
              style={{ background: "#A6192E", color: "#fff", border: "none", cursor: "pointer" }}>
              Edit details
            </button>
          </div>
        </div>
      )}

      {/* Edit panel */}
      {mode === "edit" && (
        <div className="px-4 py-3 border-t flex flex-col gap-4"
             style={{ background: "#fff", borderColor: "#EAEAEA" }}>

          {/* Reactivate banner */}
          {!isActive && (
            <div className="rounded-xl px-4 py-3 flex items-center justify-between gap-3"
                 style={{ background: "#FFF0F0", border: "1px solid #FECACA" }}>
              <p className="text-xs font-semibold" style={{ color: "#CE2033" }}>
                This account is deactivated.
              </p>
              <button onClick={() => setActiveState(true)} disabled={saving}
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
                        <span className="text-xs font-semibold" style={{ color: "#3D3D3D" }}>{c.name}</span>
                        <span className="ml-2 text-[10px]" style={{ color: "#999" }}>
                          Block {c.block_number}{c.room ? ` · ${c.room}` : ""}
                        </span>
                      </div>
                      <button onClick={() => unassignCourse(c.id)} disabled={unassigning === c.id}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-lg"
                        style={{ background: "#FFF0F0", color: "#CE2033", border: "none", cursor: "pointer",
                                 opacity: unassigning === c.id ? 0.5 : 1 }}>
                        {unassigning === c.id ? "…" : "Remove"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {unassignedCourses.length > 0 && (
                <div className="flex gap-2">
                  <select value={assignId} onChange={e => setAssignId(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl text-sm border outline-none"
                    style={{ borderColor: "#EAEAEA", color: assignId ? "#3D3D3D" : "#999", background: "#FAFAFA" }}>
                    <option value="">Assign a course…</option>
                    {unassignedCourses.map(c => (
                      <option key={c.id} value={c.id}>
                        Block {c.block_number} — {c.name}{c.room ? ` (${c.room})` : ""}
                      </option>
                    ))}
                  </select>
                  <button onClick={assignCourse} disabled={assigning || !assignId}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-white flex-shrink-0"
                    style={{ background: "#3D3D3D", opacity: assigning || !assignId ? 0.4 : 1,
                             border: "none", cursor: !assignId ? "default" : "pointer" }}>
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
              <div className="flex gap-2">
                <div className="flex-1">
                  <p className="text-[9px] font-bold uppercase tracking-wide mb-1"
                     style={{ color: "#3D3D3D", opacity: 0.4 }}>Mobile</p>
                  <input value={phoneVal} onChange={e => setPhoneVal(e.target.value)}
                    placeholder="Mobile phone" type="tel"
                    className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                    style={{ borderColor: "#EAEAEA", color: "#3D3D3D", background: "#FAFAFA" }} />
                </div>
                <div className="flex-1">
                  <p className="text-[9px] font-bold uppercase tracking-wide mb-1"
                     style={{ color: "#3D3D3D", opacity: 0.4 }}>Business</p>
                  <input value={businessPhoneVal} onChange={e => setBusinessPhoneVal(e.target.value)}
                    placeholder="Business phone" type="tel"
                    className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                    style={{ borderColor: "#EAEAEA", color: "#3D3D3D", background: "#FAFAFA" }} />
                </div>
              </div>

              {/* Dean grade levels */}
              {isPendingDean && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wide mb-1.5"
                     style={{ color: "#3D3D3D", opacity: 0.4 }}>
                    Grade Levels of Responsibility
                  </p>
                  <div className="flex gap-1.5">
                    {DEAN_GRADE_OPTIONS.map(g => (
                      <button key={g} type="button" onClick={() => toggleDeanGrade(g)}
                        className="px-4 py-1.5 rounded-xl text-xs font-bold flex-1"
                        style={{
                          background: deanGradesVal.includes(g) ? "#8B6200" : "#F4F4F4",
                          color:      deanGradesVal.includes(g) ? "#fff"    : "#999",
                          border: "none", cursor: "pointer",
                        }}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Veracross ID — confirm before enabling edit */}
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wide mb-1"
                   style={{ color: "#3D3D3D", opacity: 0.4 }}>Veracross ID</p>
                {!editingVcId ? (
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 rounded-xl text-sm"
                          style={{ background: "#F7F7F7", color: vcIdVal ? "#3D3D3D" : "#BABABA",
                                   fontFamily: "monospace" }}>
                      {vcIdVal || "Not set"}
                    </code>
                    {!confirmEditVcId ? (
                      <button type="button" onClick={() => setConfirmEditVcId(true)}
                        className="text-[10px] font-bold px-3 py-2 rounded-xl"
                        style={{ background: "#EAEAEA", color: "#3D3D3D",
                                 border: "none", cursor: "pointer" }}>
                        Edit ID
                      </button>
                    ) : (
                      <>
                        <button type="button"
                          onClick={() => { setEditingVcId(true); setConfirmEditVcId(false) }}
                          className="text-[10px] font-bold px-3 py-2 rounded-xl text-white"
                          style={{ background: "#CE2033", border: "none", cursor: "pointer" }}>
                          Confirm
                        </button>
                        <button type="button" onClick={() => setConfirmEditVcId(false)}
                          className="text-[10px] font-bold px-3 py-2 rounded-xl"
                          style={{ background: "#EAEAEA", color: "#3D3D3D",
                                   border: "none", cursor: "pointer" }}>
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  <input value={vcIdVal} onChange={e => setVcIdVal(e.target.value)}
                    placeholder="Veracross ID"
                    className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                    style={{ borderColor: "#CE2033", color: "#3D3D3D", background: "#FFF",
                             fontFamily: "monospace" }} />
                )}
                {confirmEditVcId && !editingVcId && (
                  <p className="text-[10px] mt-1" style={{ color: "#999" }}>
                    Changing this can break Veracross sync. Confirm to edit.
                  </p>
                )}
              </div>

              {/* Account ID — read-only */}
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wide mb-1"
                   style={{ color: "#3D3D3D", opacity: 0.4 }}>Account ID</p>
                <code className="block px-3 py-2 rounded-xl text-[10px]"
                      style={{ background: "#F7F7F7", color: "#999", fontFamily: "monospace",
                               wordBreak: "break-all" }}>
                  {id}
                </code>
              </div>

              <button onClick={saveDetails}
                disabled={savingDetails || !nameVal.trim() || !emailVal.trim()}
                className="w-full py-2 rounded-xl text-xs font-bold text-white mt-1"
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
                  <button key={r.value} type="button" onClick={() => togglePendingRole(r.value)}
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
              <button onClick={saveRoles} disabled={savingRoles}
                className="w-full py-2 rounded-xl text-xs font-bold text-white"
                style={{ background: "#3D3D3D", opacity: savingRoles ? 0.4 : 1, border: "none", cursor: "pointer" }}>
                {savingRoles ? "Saving…" : "Save Roles"}
              </button>
            )}
          </div>

          <div style={{ borderTop: "1px solid #F0F0F0" }} />

          {/* Deactivate (active users) */}
          {isActive && (
            <div>
              <label className="text-[9px] font-bold uppercase tracking-wide block mb-2"
                     style={{ color: "#CE2033", opacity: 0.7 }}>
                Remove Access
              </label>
              {isSelf ? (
                <p className="text-[10px]" style={{ color: "#999" }}>
                  You cannot deactivate or delete your own account.
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
                    Remove {displayName}&apos;s access?
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setActiveState(false)} disabled={saving}
                      className="flex-1 py-2 rounded-xl text-xs font-bold text-white"
                      style={{ background: "#CE2033", opacity: saving ? 0.5 : 1, border: "none", cursor: "pointer" }}>
                      {saving ? "Removing…" : "Yes, Deactivate"}
                    </button>
                    <button onClick={() => { setConfirmDelete(false); setConfirmPurge(false) }}
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
                  <button onClick={deleteUser} disabled={deleting}
                    className="w-full py-2 rounded-xl text-xs font-bold text-white"
                    style={{ background: "#7B0000", opacity: deleting ? 0.5 : 1, border: "none", cursor: "pointer" }}>
                    {deleting ? "Deleting…" : `Delete ${displayName.split(" ")[0]} permanently`}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Permanent delete (inactive users) */}
          {!isActive && !isSelf && (
            <div>
              <label className="text-[9px] font-bold uppercase tracking-wide block mb-2"
                     style={{ color: "#CE2033", opacity: 0.7 }}>
                Permanently Delete
              </label>
              {!confirmPurge ? (
                <button onClick={() => setConfirmPurge(true)}
                  className="w-full py-2 rounded-xl text-xs font-bold border"
                  style={{ borderColor: "#CE2033", color: "#CE2033", background: "#fff", cursor: "pointer" }}>
                  Delete {displayName.split(" ")[0]} permanently
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-bold text-center" style={{ color: "#CE2033" }}>
                    Permanently delete {displayName}? This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={deleteUser} disabled={deleting}
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
