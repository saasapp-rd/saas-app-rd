"use client"
import { useState, FormEvent } from "react"
import { useRouter } from "next/navigation"

const GRADES = [9, 10, 11, 12]

export default function AddStudentForm() {
  const router = useRouter()
  const [open,        setOpen]        = useState(false)
  const [lastName,    setLastName]    = useState("")
  const [firstName,   setFirstName]   = useState("")
  const [callBy,      setCallBy]      = useState("")
  const [grade,       setGrade]       = useState<number | null>(null)
  const [phone,       setPhone]       = useState("")
  const [veracrossId, setVeracrossId] = useState("")
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState("")
  const [success,     setSuccess]     = useState("")

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!grade) { setError("Select a grade."); return }
    setLoading(true); setError(""); setSuccess("")

    const res = await fetch("/api/admin/users", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        last_name:    lastName.trim(),
        first_name:   firstName.trim(),
        call_by:      callBy.trim() || firstName.trim(),
        grade,
        phone:        phone.trim() || null,
        veracross_id: veracrossId.trim() || null,
        role:         "student",
        roles:        ["student"],
      }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? "Failed to add student.")
    } else {
      setSuccess(`${lastName}, ${firstName} (Gr ${grade}) added.`)
      setLastName(""); setFirstName(""); setCallBy("")
      setGrade(null); setPhone(""); setVeracrossId("")
      router.refresh()
    }
    setLoading(false)
  }

  const inp = "w-full px-3 py-2.5 rounded-xl text-sm border outline-none"
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
          Add Student
        </p>
        <span className="text-xs" style={{ color: open ? "#A6192E" : "#BABABA" }}>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <form onSubmit={handleSubmit}
              className="px-4 pb-4 pt-1 flex flex-col gap-2.5 border-t"
              style={{ background: "#fff", borderColor: "#EAEAEA" }}>

          <div className="grid grid-cols-2 gap-2">
            <input value={lastName}  onChange={e => setLastName(e.target.value)}
              placeholder="Last name" required className={inp} style={inpStyle} />
            <input value={firstName} onChange={e => setFirstName(e.target.value)}
              placeholder="First name" required className={inp} style={inpStyle} />
          </div>

          <input value={callBy} onChange={e => setCallBy(e.target.value)}
            placeholder="Preferred name (if different from first)"
            className={inp} style={inpStyle} />

          <div>
            <p className="text-[9px] font-bold tracking-[0.2em] uppercase mb-1.5"
               style={{ color: "#3D3D3D", opacity: 0.4 }}>
              Grade
            </p>
            <div className="flex gap-2">
              {GRADES.map(g => (
                <button key={g} type="button" onClick={() => setGrade(g)}
                  className="flex-1 py-2 rounded-xl text-sm font-bold"
                  style={{
                    background: grade === g ? "#A6192E" : "#F4F4F4",
                    color:      grade === g ? "#fff"    : "#999",
                    border:     "none", cursor: "pointer",
                  }}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="Phone (optional)" type="tel" className={inp} style={inpStyle} />
            <input value={veracrossId} onChange={e => setVeracrossId(e.target.value)}
              placeholder="Person ID (optional)" className={inp} style={inpStyle} />
          </div>

          {error   && <p className="text-xs font-semibold" style={{ color: "#CE2033" }}>{error}</p>}
          {success && <p className="text-xs font-semibold" style={{ color: "#166534" }}>{success}</p>}

          <button type="submit" disabled={loading || !grade}
            className="w-full py-3 rounded-xl text-sm font-bold text-white"
            style={{ background: "#A6192E", opacity: loading || !grade ? 0.5 : 1, border: "none", cursor: "pointer" }}>
            {loading ? "Adding…" : "Add Student"}
          </button>
        </form>
      )}
    </div>
  )
}
