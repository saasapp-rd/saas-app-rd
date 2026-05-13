"use client"
import { useState, FormEvent } from "react"
import { useRouter } from "next/navigation"

const ROLES = [
  { value: "teacher",     label: "Teacher"     },
  { value: "coordinator", label: "Coordinator" },
  { value: "counselor",   label: "Counselor"   },
  { value: "dean",        label: "Dean"        },
  { value: "staff",       label: "Staff"       },
  { value: "admin",       label: "Admin"       },
  { value: "super_admin", label: "Super Admin" },
]

export default function AddUserForm({
  defaultRole = "teacher",
  callerRole  = "admin",
}: {
  defaultRole?: string
  callerRole?:  string
}) {
  const roles = callerRole === "super_admin" ? ROLES : ROLES.filter(r => r.value !== "super_admin")
  const router = useRouter()
  const [email,       setEmail]       = useState("")
  const [displayName, setDisplayName] = useState("")
  const [phone,       setPhone]       = useState("")
  const [role,        setRole]        = useState(defaultRole)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState("")
  const [success,     setSuccess]     = useState("")

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    const r = await fetch("/api/admin/users", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        email,
        display_name: displayName,
        role,
        phone: phone.trim() || null,
      }),
    })
    const data = await r.json()

    if (!r.ok) {
      setError(data.error ?? "Failed to add user.")
    } else {
      setSuccess(displayName + " added as " + role + ".")
      setEmail("")
      setDisplayName("")
      setPhone("")
      setRole(defaultRole)
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

      <select
        value={role}
        onChange={e => setRole(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl text-sm border outline-none"
        style={{ borderColor: "#EAEAEA", background: "#fff", color: "#3D3D3D" }}
      >
        {roles.map(r => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>

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
