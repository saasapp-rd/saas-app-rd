"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

const ALL_ROLES = [
  { value: "student",     label: "Student"     },
  { value: "teacher",     label: "Teacher"     },
  { value: "staff",       label: "Staff"       },
  { value: "coordinator", label: "Coordinator" },
  { value: "counselor",   label: "Counselor"   },
  { value: "dean",        label: "Dean"        },
  { value: "admin",       label: "Admin"       },
  { value: "super_admin", label: "Super Admin" },
]

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  super_admin: { bg: "#FFF0F0", color: "#A6192E" },
  admin:       { bg: "#FFF0F0", color: "#A6192E" },
  dean:        { bg: "#FFF8E0", color: "#8B6200" },
  coordinator: { bg: "#EEF6FF", color: "#1E5FA6" },
  counselor:   { bg: "#F0FDF4", color: "#166534" },
  teacher:     { bg: "#EAEAEA", color: "#3D3D3D" },
  staff:       { bg: "#EAEAEA", color: "#3D3D3D" },
  student:     { bg: "#EAEAEA", color: "#3D3D3D" },
}

interface Props {
  id:          string
  displayName: string
  email:       string
  role:        string
  isSelf:      boolean   // prevent self-deactivation
}

export default function UserRowActions({ id, displayName, email, role, isSelf }: Props) {
  const router          = useRouter()
  const [open,          setOpen]          = useState(false)
  const [selectedRole,  setSelectedRole]  = useState(role)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState("")

  const style = ROLE_STYLE[role] ?? ROLE_STYLE["staff"]

  async function changeRole() {
    if (selectedRole === role) { setOpen(false); return }
    setSaving(true)
    setError("")
    const res = await fetch("/api/admin/users", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id, role: selectedRole }),
    })
    if (res.ok) {
      router.refresh()
      setOpen(false)
    } else {
      const d = await res.json()
      setError(d.error ?? "Failed to update role.")
    }
    setSaving(false)
  }

  async function deactivate() {
    setSaving(true)
    setError("")
    const res = await fetch("/api/admin/users", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id, is_active: false }),
    })
    if (res.ok) {
      router.refresh()
    } else {
      const d = await res.json()
      setError(d.error ?? "Failed to deactivate user.")
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border overflow-hidden"
         style={{ borderColor: open ? "#A6192E" : "#EAEAEA" }}>

      {/* Main row */}
      <div className="px-4 py-2.5 flex items-center justify-between"
           style={{ background: open ? "#FFF8F8" : "#FAFAFA" }}>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate" style={{ color: "#3D3D3D" }}>
            {displayName}
          </div>
          <div className="text-[10px] truncate" style={{ color: "#999" }}>{email}</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase"
                style={{ background: style.bg, color: style.color }}>
            {role.replace("_", " ")}
          </span>
          <button
            onClick={() => { setOpen(o => !o); setConfirmDelete(false); setError("") }}
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

      {/* Inline actions — revealed on Edit */}
      {open && (
        <div className="px-4 py-3 border-t flex flex-col gap-3"
             style={{ background: "#fff", borderColor: "#EAEAEA" }}>

          {/* Role change */}
          <div>
            <label className="text-[9px] font-bold uppercase tracking-wide block mb-1.5"
                   style={{ color: "#3D3D3D", opacity: 0.5 }}>
              Change Role
            </label>
            <div className="flex gap-2">
              <select
                value={selectedRole}
                onChange={e => setSelectedRole(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl text-sm border outline-none"
                style={{ borderColor: "#EAEAEA", color: "#3D3D3D", background: "#FAFAFA" }}>
                {ALL_ROLES.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <button
                onClick={changeRole}
                disabled={saving || selectedRole === role}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white"
                style={{
                  background: "#3D3D3D",
                  opacity: saving || selectedRole === role ? 0.4 : 1,
                  border: "none", cursor: selectedRole === role ? "default" : "pointer",
                }}>
                {saving ? "…" : "Save"}
              </button>
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: "1px solid #F0F0F0" }} />

          {/* Deactivate */}
          <div>
            <label className="text-[9px] font-bold uppercase tracking-wide block mb-1.5"
                   style={{ color: "#CE2033", opacity: 0.7 }}>
              Remove Access
            </label>

            {isSelf ? (
              <p className="text-[10px]" style={{ color: "#999" }}>
                You cannot deactivate your own account.
              </p>
            ) : !confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full py-2 rounded-xl text-xs font-bold border"
                style={{ borderColor: "#CE2033", color: "#CE2033", background: "#fff", cursor: "pointer" }}>
                Deactivate {displayName.split(" ")[0]}
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs font-bold text-center" style={{ color: "#CE2033" }}>
                  Remove {displayName}&apos;s access? This cannot be undone easily.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={deactivate}
                    disabled={saving}
                    className="flex-1 py-2 rounded-xl text-xs font-bold text-white"
                    style={{ background: "#CE2033", opacity: saving ? 0.5 : 1, border: "none", cursor: "pointer" }}>
                    {saving ? "Removing…" : "Yes, Remove"}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold"
                    style={{ background: "#EAEAEA", color: "#3D3D3D", border: "none", cursor: "pointer" }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

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
