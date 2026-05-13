"use client"
import { useState, FormEvent } from "react"
import { useRouter } from "next/navigation"

const ALL_ROLES = [
  { value: "teacher",     label: "Teacher"     },
  { value: "advisor",     label: "Advisor"     },
  { value: "coordinator", label: "Coordinator" },
  { value: "counselor",   label: "Counselor"   },
  { value: "dean",        label: "Dean"        },
  { value: "staff",       label: "Staff"       },
  { value: "admin",       label: "Admin"       },
  { value: "super_admin", label: "Super Admin" },
  { value: "parent",      label: "Parent"      },
]

const ROLE_STYLE: Record<string, { bg: string; color: string; selBg: string; selColor: string }> = {
  super_admin: { bg: "#F4F4F4", color: "#999", selBg: "#FFF0F0", selColor: "#A6192E" },
  admin:       { bg: "#F4F4F4", color: "#999", selBg: "#FFF0F0", selColor: "#A6192E" },
  dean:        { bg: "#F4F4F4", color: "#999", selBg: "#FFF8E0", selColor: "#8B6200" },
  coordinator: { bg: "#F4F4F4", color: "#999", selBg: "#EEF6FF", selColor: "#1E5FA6" },
  counselor:   { bg: "#F4F4F4", color: "#999", selBg: "#F0FDF4", selColor: "#166534" },
  teacher:     { bg: "#F4F4F4", color: "#999", selBg: "#EAEAEA", selColor: "#3D3D3D" },
  advisor:     { bg: "#F4F4F4", color: "#999", selBg: "#EAEAEA", selColor: "#3D3D3D" },
  staff:       { bg: "#F4F4F4", color: "#999", selBg: "#EAEAEA", selColor: "#3D3D3D" },
  parent:      { bg: "#F4F4F4", color: "#999", selBg: "#EAEAEA", selColor: "#3D3D3D" },
}

export default function AddUserForm({
  defaultRole = "teacher",
  callerRole  = "admin",
}: {
  defaultRole?: string
  callerRole?:  string
}) {
  const availableRoles = callerRole === "super_admin"
    ? ALL_ROLES
    : ALL_ROLES.filter(r => r.value !== "super_admin")

  const router = useRouter()
  const [email,        setEmail]        = useState("")
  const [displayName,  setDisplayName]  = useState("")
  const [phone,        setPhone]        = useState("")
  const [selectedRoles, setSelectedRoles] = useState<string[]>(
    availableRoles.some(r => r.value === defaultRole) ? [defaultRole] : [availableRoles[0]?.value ?? "teacher"]
  )
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState("")
  const [success,  setSuccess]  = useState("")

  function toggleRole(value: string) {
    setSelectedRoles(prev => {
      if (prev.includes(value)) {
        // Must keep at least one role
        if (prev.length === 1) return prev
        return prev.filter(r => r !== value)
      }
      return [...prev, value]
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (selectedRoles.length === 0) { setError("Select at least one role."); return }
    setLoading(true)
    setError("")
    setSuccess("")

    const r = await fetch("/api/admin/users", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        email,
        display_name: displayName,
        roles: selectedRoles,
        phone: phone.trim() || null,
      }),
    })
    const data = await r.json()

    if (!r.ok) {
      setError(data.error ?? "Failed to add user.")
    } else {
      const roleLabel = selectedRoles.map(rv => ALL_ROLES.find(r => r.value === rv)?.label ?? rv).join(", ")
      setSuccess(displayName + " added as " + roleLabel + ".")
      setEmail("")
      setDisplayName("")
      setPhone("")
      setSelectedRoles([availableRoles[0]?.value ?? "teacher"])
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4 rounded-xl border"
          style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
      <p className="text-[9px] font-bold tracking-[0.25em] uppercase"
         style={{ color: "#3D3D3D", opacity: 0.4 }}>
        Add Member
      </p>

      <input
        type="email"
        placeholder="Email (@seattleacademy.org)"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        className="w-full px-4 py-2.5 rounded-xl text-sm border outline-none"
        style={{ borderColor: "#EAEAEA", background: "#fff", color: "#3D3D3D" }}
      />

      <input
        type="text"
        placeholder="Display name (e.g. Ms. Jones)"
        value={displayName}
        onChange={e => setDisplayName(e.target.value)}
        required
        className="w-full px-4 py-2.5 rounded-xl text-sm border outline-none"
        style={{ borderColor: "#EAEAEA", background: "#fff", color: "#3D3D3D" }}
      />

      <input
        type="tel"
        placeholder="Phone number (optional)"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl text-sm border outline-none"
        style={{ borderColor: "#EAEAEA", background: "#fff", color: "#3D3D3D" }}
      />

      {/* Role chips */}
      <div>
        <p className="text-[9px] font-bold tracking-[0.2em] uppercase mb-2"
           style={{ color: "#3D3D3D", opacity: 0.4 }}>
          Roles — select all that apply
        </p>
        <div className="flex flex-wrap gap-1.5">
          {availableRoles.map(r => {
            const sel = selectedRoles.includes(r.value)
            const s   = ROLE_STYLE[r.value] ?? ROLE_STYLE["staff"]
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => toggleRole(r.value)}
                className="px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors"
                style={{
                  background: sel ? s.selBg  : s.bg,
                  color:      sel ? s.selColor : s.color,
                  border:     sel ? `1.5px solid ${s.selColor}` : "1.5px solid transparent",
                  cursor:     "pointer",
                }}
              >
                {r.label}
              </button>
            )
          })}
        </div>
      </div>

      {error   && <p className="text-xs font-semibold text-center" style={{ color: "#CE2033" }}>{error}</p>}
      {success && <p className="text-xs font-semibold text-center" style={{ color: "#166534" }}>{success}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl text-white text-sm font-bold"
        style={{ background: "#A6192E", opacity: loading ? 0.6 : 1 }}
      >
        {loading ? "Adding..." : "Add Member"}
      </button>
    </form>
  )
}
