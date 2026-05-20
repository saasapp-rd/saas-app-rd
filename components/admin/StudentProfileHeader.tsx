"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

const FLAG_STYLE: Record<string, { bg: string; color: string }> = {
  elevated:  { bg: "#FFF0F0", color: "#A6192E" },
  watch:     { bg: "#FFF8E0", color: "#8B6200" },
  emergency: { bg: "#FFE0E0", color: "#7B0000" },
}

const GRADES = [9, 10, 11, 12]

interface Student {
  id:                    string
  first_name:            string | null
  last_name:             string | null
  call_by:               string | null
  grade:                 number | null
  veracross_id:          string | null
  parent_email:          string | null
  phone:                 string | null
  schedule_acknowledged: boolean
}

export default function StudentProfileHeader({
  student,
  topFlag,
  hasScheduleIssues,
  canSeePhone,
  canEditProfile,
  canAckSchedule,
}: {
  student:           Student
  topFlag:           { level: string } | null
  hasScheduleIssues: boolean
  canSeePhone:       boolean
  canEditProfile:    boolean
  canAckSchedule:    boolean
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [acking,  setAcking]  = useState(false)
  const [err,     setErr]     = useState("")

  async function toggleAck() {
    setAcking(true); setErr("")
    const res = await fetch("/api/admin/users", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id: student.id, schedule_acknowledged: !student.schedule_acknowledged }),
    })
    if (res.ok) {
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      setErr(d.error ?? "Failed to update.")
    }
    setAcking(false)
  }

  const acknowledged = student.schedule_acknowledged
  const ackBadgeShown = acknowledged && hasScheduleIssues

  return (
    <>
      <div className="rounded-xl p-4 border" style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
        <div className="flex items-start justify-between mb-3 gap-2">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black flex-shrink-0"
               style={{ background: "#EAEAEA", color: "#888" }}>
            {(student.last_name ?? "?")[0]}{(student.first_name ?? "?")[0]}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {ackBadgeShown && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase"
                    style={{ background: "#FFF1D6", color: "#A06000" }}
                    title="Schedule is a known-OK variant — admin has acknowledged it.">
                ✓ Variant OK
              </span>
            )}
            {topFlag && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase"
                    style={{
                      background: FLAG_STYLE[topFlag.level]?.bg ?? "#EAEAEA",
                      color:      FLAG_STYLE[topFlag.level]?.color ?? "#666",
                    }}>
                {topFlag.level} concern
              </span>
            )}
            {canEditProfile && (
              <button onClick={() => setEditing(true)}
                className="text-[10px] font-bold px-2 py-1 rounded-lg"
                style={{ background: "#EAEAEA", color: "#3D3D3D", border: "none", cursor: "pointer" }}>
                Edit
              </button>
            )}
          </div>
        </div>

        <h1 className="text-lg font-black mb-0.5" style={{ color: "#3D3D3D" }}>
          {student.last_name}, {student.first_name}
          {student.call_by && student.call_by !== student.first_name && (
            <span className="text-xs font-normal ml-2" style={{ color: "#999" }}>
              ({student.call_by})
            </span>
          )}
        </h1>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px]" style={{ color: "#999" }}>
          <span>Grade {student.grade ?? "—"}</span>
          {student.veracross_id && <span>ID: {student.veracross_id}</span>}
          {canSeePhone && student.phone && (
            <span><a href={`tel:${student.phone}`} style={{ color: "#1E5FA6", textDecoration: "none" }}>📱 {student.phone}</a></span>
          )}
          {student.parent_email && <span>{student.parent_email}</span>}
        </div>

        {hasScheduleIssues && canAckSchedule && (
          <button onClick={toggleAck} disabled={acking}
            className="mt-3 text-[10px] font-bold px-3 py-1.5 rounded-lg"
            style={{
              background: acknowledged ? "#fff" : "#FFF1D6",
              color: "#A06000",
              border: "1px solid #FDE68A",
              cursor: "pointer", opacity: acking ? 0.5 : 1,
            }}>
            {acking
              ? "…"
              : acknowledged
                ? "Un-acknowledge schedule variant"
                : "Mark schedule as known-OK variant"}
          </button>
        )}

        {err && (
          <p className="text-[10px] font-semibold mt-2" style={{ color: "#CE2033" }}>{err}</p>
        )}
      </div>

      {editing && (
        <EditModal student={student} onClose={() => setEditing(false)} />
      )}
    </>
  )
}

function EditModal({
  student,
  onClose,
}: {
  student:  Student
  onClose:  () => void
}) {
  const router = useRouter()
  const [lastName,  setLastName]  = useState(student.last_name   ?? "")
  const [firstName, setFirstName] = useState(student.first_name  ?? "")
  const [callBy,    setCallBy]    = useState(student.call_by     ?? "")
  const [grade,     setGrade]     = useState<number | null>(student.grade)
  const [phone,     setPhone]     = useState(student.phone       ?? "")
  const [vcId,      setVcId]      = useState(student.veracross_id ?? "")
  const [saving,    setSaving]    = useState(false)
  const [err,       setErr]       = useState("")

  // Modal scroll lock — html + body, same pattern as elsewhere.
  useEffect(() => {
    const scrollY = window.scrollY
    const html = document.documentElement
    const body = document.body
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyPosition: body.style.position,
      bodyTop:      body.style.top,
      bodyLeft:     body.style.left,
      bodyRight:    body.style.right,
      bodyWidth:    body.style.width,
      bodyOverflow: body.style.overflow,
    }
    html.style.overflow = "hidden"
    body.style.position = "fixed"
    body.style.top      = `-${scrollY}px`
    body.style.left     = "0"
    body.style.right    = "0"
    body.style.width    = "100%"
    body.style.overflow = "hidden"
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    return () => {
      html.style.overflow = prev.htmlOverflow
      body.style.position = prev.bodyPosition
      body.style.top      = prev.bodyTop
      body.style.left     = prev.bodyLeft
      body.style.right    = prev.bodyRight
      body.style.width    = prev.bodyWidth
      body.style.overflow = prev.bodyOverflow
      window.scrollTo(0, scrollY)
      window.removeEventListener("keydown", onKey)
    }
  }, [onClose])

  async function save() {
    if (!lastName.trim() || !firstName.trim() || !grade) return
    setSaving(true); setErr("")
    const res = await fetch("/api/admin/users", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        id:           student.id,
        last_name:    lastName.trim(),
        first_name:   firstName.trim(),
        call_by:      callBy.trim() || firstName.trim(),
        grade,
        phone:        phone.trim() || null,
        veracross_id: vcId.trim()  || null,
      }),
    })
    if (res.ok) { router.refresh(); onClose() }
    else { const d = await res.json().catch(() => ({})); setErr(d.error ?? "Failed to update.") }
    setSaving(false)
  }

  const inputStyle = {
    borderColor: "#EAEAEA", color: "#3D3D3D", background: "#FAFAFA",
  } as const

  return (
    <div onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}>
      <div onClick={e => e.stopPropagation()}
        className="bg-white w-full sm:max-w-md flex flex-col rounded-t-2xl sm:rounded-2xl"
        style={{ maxHeight: "85vh", overscrollBehavior: "contain" }}>

        <div className="px-4 py-3 flex items-center justify-between border-b"
             style={{ borderColor: "#EAEAEA" }}>
          <p className="text-sm font-bold" style={{ color: "#3D3D3D" }}>Edit Student</p>
          <button onClick={onClose}
            className="text-sm font-bold w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "#EAEAEA", color: "#3D3D3D", border: "none", cursor: "pointer" }}
            aria-label="Close">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2"
             style={{ overscrollBehavior: "contain" }}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[9px] font-bold uppercase mb-1" style={{ color: "#999" }}>Last name</p>
              <input value={lastName} onChange={e => setLastName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border outline-none" style={inputStyle} />
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase mb-1" style={{ color: "#999" }}>First name</p>
              <input value={firstName} onChange={e => setFirstName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm border outline-none" style={inputStyle} />
            </div>
          </div>

          <div>
            <p className="text-[9px] font-bold uppercase mb-1" style={{ color: "#999" }}>Preferred / call-by</p>
            <input value={callBy} onChange={e => setCallBy(e.target.value)}
              placeholder={firstName || "First name"}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none" style={inputStyle} />
          </div>

          <div>
            <p className="text-[9px] font-bold uppercase mb-1" style={{ color: "#999" }}>Grade</p>
            <div className="flex gap-1">
              {GRADES.map(g => (
                <button key={g} type="button" onClick={() => setGrade(g)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-bold"
                  style={{
                    background: grade === g ? "#A6192E" : "#F4F4F4",
                    color:      grade === g ? "#fff"    : "#999",
                    border: "none", cursor: "pointer",
                  }}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[9px] font-bold uppercase mb-1" style={{ color: "#999" }}>Mobile phone</p>
            <input value={phone} onChange={e => setPhone(e.target.value)}
              type="tel"
              placeholder="(206) 555-0100"
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none" style={inputStyle} />
          </div>

          <div>
            <p className="text-[9px] font-bold uppercase mb-1" style={{ color: "#999" }}>Veracross ID</p>
            <input value={vcId} onChange={e => setVcId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ ...inputStyle, fontFamily: "monospace" }} />
          </div>

          {err && (
            <p className="text-[10px] font-semibold mt-1" style={{ color: "#CE2033" }}>{err}</p>
          )}
        </div>

        <div className="px-4 py-3 border-t flex items-center justify-end gap-2"
             style={{ borderColor: "#EAEAEA", background: "#FAFAFA" }}>
          <button onClick={onClose}
            className="text-xs font-bold px-3 py-2 rounded-lg"
            style={{ background: "#EAEAEA", color: "#3D3D3D", border: "none", cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={save}
            disabled={saving || !lastName.trim() || !firstName.trim() || !grade}
            className="text-xs font-bold px-4 py-2 rounded-lg text-white"
            style={{
              background: "#A6192E", border: "none", cursor: "pointer",
              opacity: saving || !lastName.trim() || !firstName.trim() || !grade ? 0.5 : 1,
            }}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}
