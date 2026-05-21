"use client"
import { useState, FormEvent } from "react"
import { useRouter } from "next/navigation"

const ROLE_LABEL: Record<string, string> = {
  teacher:        "Teacher",
  advisor:        "Advisor",
  coordinator:    "Coordinator",
  counselor:      "Counselor",
  nurse:          "Nurse / Health",
  accommodations: "Accommodations",
  dean:           "Dean",
  staff:          "Staff",
  admin:          "Administrator",
  super_admin:    "Super Admin",
  parent:         "Parent",
}

const DEAN_GRADE_OPTIONS = [9, 10, 11, 12]

export default function AddUserForm({
  defaultRole = "teacher",
  callerRole  = "admin",
}: {
  defaultRole?: string
  callerRole?:  string
}) {
  const router = useRouter()

  const [open,           setOpen]           = useState(false)
  const [email,          setEmail]          = useState("")
  const [displayName,    setDisplayName]    = useState("")
  const [phone,          setPhone]          = useState("")
  const [businessPhone,  setBusinessPhone]  = useState("")
  const [jobTitle,       setJobTitle]       = useState("")
  const [deanGrades,     setDeanGrades]     = useState<number[]>([])
  const [veracrossId,    setVeracrossId]    = useState("")
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState("")
  const [success,        setSuccess]        = useState("")

  // Only super_admins can create super_admin accounts
  const canCreate = defaultRole !== "super_admin" || callerRole === "super_admin"
  if (!canCreate) return null

  const label   = ROLE_LABEL[defaultRole] ?? defaultRole
  const isDean  = defaultRole === "dean"
  // Job title makes sense for staff-side roles, not for students/parents/advisors.
  const showJob = ["teacher","staff","coordinator","counselor","nurse","accommodations","dean","admin","super_admin"].includes(defaultRole)

  function toggleDeanGrade(g: number) {
    setDeanGrades(prev =>
      prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g].sort((a, b) => a - b)
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true); setError(""); setSuccess("")

    const body: Record<string, unknown> = {
      email:          email.trim().toLowerCase(),
      display_name:   displayName.trim(),
      phone:          phone.trim() || null,
      business_phone: businessPhone.trim() || null,
      role:           defaultRole,
      roles:          [defaultRole],
    }
    if (showJob)            body.job_title    = jobTitle.trim() || null
    if (isDean)             body.dean_grades  = deanGrades
    if (veracrossId.trim()) body.veracross_id = veracrossId.trim()

    const res  = await fetch("/api/admin/users", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? `Failed to add ${label.toLowerCase()}.`)
    } else {
      setSuccess(`${displayName} added as ${label}.`)
      setEmail(""); setDisplayName(""); setPhone(""); setBusinessPhone("")
      setJobTitle(""); setDeanGrades([]); setVeracrossId("")
      router.refresh()
    }
    setLoading(false)
  }

  const inp      = "w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
  const inpStyle = { borderColor: "#EAEAEA", background: "#fff", color: "#3D3D3D" }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#EAEAEA" }}>
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setError(""); setSuccess("") }}
        className="w-full px-4 py-3 flex items-center justify-between"
        style={{ background: open ? "#FFF8F8" : "#FAFAFA", border: "none", cursor: "pointer" }}>
        <p className="text-[9px] font-bold tracking-[0.25em] uppercase"
           style={{ color: open ? "#A6192E" : "#3D3D3D", opacity: open ? 1 : 0.4 }}>
          Add {label}
        </p>
        <span className="text-xs" style={{ color: open ? "#A6192E" : "#BABABA" }}>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <form onSubmit={handleSubmit}
              className="px-4 pb-4 pt-1 flex flex-col gap-2.5 border-t"
              style={{ background: "#fff", borderColor: "#EAEAEA" }}>

          <input value={displayName} onChange={e => setDisplayName(e.target.value)}
            placeholder="Full name (e.g. Jane Smith or Ms. Jones)"
            required className={inp} style={inpStyle} />

          <input value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email address" type="email" required className={inp} style={inpStyle} />

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[9px] font-bold tracking-[0.2em] uppercase mb-1"
                 style={{ color: "#3D3D3D", opacity: 0.4 }}>Mobile</p>
              <input value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="Mobile phone" type="tel" className={inp} style={inpStyle} />
            </div>
            <div>
              <p className="text-[9px] font-bold tracking-[0.2em] uppercase mb-1"
                 style={{ color: "#3D3D3D", opacity: 0.4 }}>Business</p>
              <input value={businessPhone} onChange={e => setBusinessPhone(e.target.value)}
                placeholder="Business phone" type="tel" className={inp} style={inpStyle} />
            </div>
          </div>

          {showJob && (
            <input value={jobTitle} onChange={e => setJobTitle(e.target.value)}
              placeholder="Job title (optional, e.g. Head of Upper School)"
              className={inp} style={inpStyle} />
          )}

          {isDean && (
            <div>
              <p className="text-[9px] font-bold tracking-[0.2em] uppercase mb-1.5"
                 style={{ color: "#3D3D3D", opacity: 0.4 }}>
                Grade Levels of Responsibility
              </p>
              <div className="flex gap-2">
                {DEAN_GRADE_OPTIONS.map(g => (
                  <button key={g} type="button" onClick={() => toggleDeanGrade(g)}
                    className="flex-1 py-2 rounded-xl text-sm font-bold"
                    style={{
                      background: deanGrades.includes(g) ? "#8B6200" : "#F4F4F4",
                      color:      deanGrades.includes(g) ? "#fff"    : "#999",
                      border:     "none", cursor: "pointer",
                    }}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
          )}

          <input value={veracrossId} onChange={e => setVeracrossId(e.target.value)}
            placeholder="Veracross Person ID (optional)" className={inp} style={inpStyle} />

          {error   && <p className="text-xs font-semibold" style={{ color: "#CE2033" }}>{error}</p>}
          {success && <p className="text-xs font-semibold" style={{ color: "#166534" }}>{success}</p>}

          <button type="submit" disabled={loading || !displayName.trim() || !email.trim()}
            className="w-full py-3 rounded-xl text-sm font-bold text-white"
            style={{
              background: "#A6192E",
              opacity:    loading || !displayName.trim() || !email.trim() ? 0.5 : 1,
              border: "none", cursor: "pointer",
            }}>
            {loading ? "Adding…" : `Add ${label}`}
          </button>
        </form>
      )}
    </div>
  )
}
