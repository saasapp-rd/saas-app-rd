"use client"
import { useState, FormEvent } from "react"
import { useRouter } from "next/navigation"

export default function AddStudentForm() {
  const router = useRouter()
  const [tab, setTab] = useState<"single" | "bulk">("single")

  // Single fields
  const [firstName, setFirstName] = useState("")
  const [lastName,  setLastName]  = useState("")
  const [grade,     setGrade]     = useState("")
  const [studentId, setStudentId] = useState("")

  // Bulk
  const [bulkText, setBulkText] = useState("")

  const [status,  setStatus]  = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSingle(e: FormEvent) {
    e.preventDefault()
    setLoading(true); setStatus("")
    const res = await fetch("/api/admin/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: firstName, last_name: lastName,
        grade: Number(grade), student_id: studentId || undefined,
      }),
    })
    if (res.ok) {
      setFirstName(""); setLastName(""); setGrade(""); setStudentId("")
      setStatus("Student added.")
      router.refresh()
    } else {
      const err = await res.json()
      setStatus("Error: " + err.error)
    }
    setLoading(false)
  }

  async function handleBulk(e: FormEvent) {
    e.preventDefault()
    setLoading(true); setStatus("")
    const students = bulkText.trim().split("\n")
      .map(line => {
        const [fn, ln, gr, sid] = line.split(",").map(s => s.trim())
        return { first_name: fn, last_name: ln, grade: Number(gr), student_id: sid || undefined }
      })
      .filter(s => s.first_name && s.last_name && s.grade >= 6 && s.grade <= 12)

    const res = await fetch("/api/admin/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bulk: students }),
    })
    if (res.ok) {
      const d = await res.json()
      setBulkText("")
      setStatus("Added " + d.count + " students.")
      router.refresh()
    } else {
      const err = await res.json()
      setStatus("Error: " + err.error)
    }
    setLoading(false)
  }

  const inputStyle = { borderColor: "#EAEAEA", background: "#fff", color: "#3D3D3D" }

  return (
    <div className="rounded-xl border p-4" style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
      <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-3" style={{ color: "#3D3D3D", opacity: 0.35 }}>
        Add Students
      </p>

      <div className="flex gap-2 mb-4">
        {(["single", "bulk"] as const).map(t => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className="px-3 py-1.5 rounded-lg text-[10px] font-bold"
            style={{ background: tab === t ? "#A6192E" : "#EAEAEA", color: tab === t ? "#fff" : "#3D3D3D" }}>
            {t === "single" ? "Single" : "Bulk (CSV)"}
          </button>
        ))}
      </div>

      {tab === "single" ? (
        <form onSubmit={handleSingle} className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="First name" required
              className="px-3 py-2 rounded-lg text-sm border outline-none" style={inputStyle} />
            <input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Last name" required
              className="px-3 py-2 rounded-lg text-sm border outline-none" style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input value={grade} onChange={e => setGrade(e.target.value)} placeholder="Grade (6-12)"
              required type="number" min="6" max="12"
              className="px-3 py-2 rounded-lg text-sm border outline-none" style={inputStyle} />
            <input value={studentId} onChange={e => setStudentId(e.target.value)} placeholder="Student ID (optional)"
              className="px-3 py-2 rounded-lg text-sm border outline-none" style={inputStyle} />
          </div>
          <button type="submit" disabled={loading}
            className="py-2 rounded-lg text-xs font-bold text-white"
            style={{ background: "#A6192E", opacity: loading ? 0.6 : 1 }}>
            {loading ? "Adding..." : "Add Student"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleBulk} className="flex flex-col gap-2">
          <p className="text-[10px]" style={{ color: "#999" }}>
            One per line: FirstName, LastName, Grade, StudentID (ID optional)
          </p>
          <textarea value={bulkText} onChange={e => setBulkText(e.target.value)} required rows={6}
            placeholder={"Jane, Doe, 10, V12345\nMarcus, Lee, 11\nMaya, Torres, 10, V12347"}
            className="px-3 py-2 rounded-lg text-sm border outline-none font-mono"
            style={{ ...inputStyle, resize: "vertical" }} />
          <button type="submit" disabled={loading}
            className="py-2 rounded-lg text-xs font-bold text-white"
            style={{ background: "#A6192E", opacity: loading ? 0.6 : 1 }}>
            {loading ? "Importing..." : "Import Students"}
          </button>
        </form>
      )}

      {status && (
        <p className="mt-2 text-xs font-semibold"
          style={{ color: status.startsWith("Error") ? "#CE2033" : "#2D7D46" }}>
          {status}
        </p>
      )}
    </div>
  )
}
