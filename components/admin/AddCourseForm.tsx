"use client"
import { useState, FormEvent } from "react"
import { useRouter } from "next/navigation"

interface Teacher { id: string; display_name: string | null }

export default function AddCourseForm({ teachers }: { teachers: Teacher[] }) {
  const router = useRouter()
  const [name,      setName]      = useState("")
  const [teacherId, setTeacherId] = useState("")
  const [block,     setBlock]     = useState("")
  const [room,      setRoom]      = useState("")
  const [status,    setStatus]    = useState("")
  const [loading,   setLoading]   = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true); setStatus("")
    const res = await fetch("/api/admin/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        teacher_id:   teacherId || null,
        block_number: Number(block),
        room:         room || null,
      }),
    })
    if (res.ok) {
      setName(""); setTeacherId(""); setBlock(""); setRoom("")
      setStatus("Course added.")
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
        Add Course
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Course name (e.g. AP Biology)" required
          className="px-3 py-2 rounded-lg text-sm border outline-none" style={inputStyle} />
        <div className="grid grid-cols-2 gap-2">
          <select value={teacherId} onChange={e => setTeacherId(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm border outline-none" style={inputStyle}>
            <option value="">No teacher assigned</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.display_name}</option>)}
          </select>
          <select value={block} onChange={e => setBlock(e.target.value)} required
            className="px-3 py-2 rounded-lg text-sm border outline-none" style={inputStyle}>
            <option value="">Block...</option>
            {[1,2,3,4,5,6,7,8].map(b => <option key={b} value={b}>Block {b}</option>)}
          </select>
        </div>
        <input value={room} onChange={e => setRoom(e.target.value)} placeholder="Room (optional)"
          className="px-3 py-2 rounded-lg text-sm border outline-none" style={inputStyle} />
        <button type="submit" disabled={loading}
          className="py-2 rounded-lg text-xs font-bold text-white"
          style={{ background: "#A6192E", opacity: loading ? 0.6 : 1 }}>
          {loading ? "Adding..." : "Add Course"}
        </button>
      </form>
      {status && (
        <p className="mt-2 text-xs font-semibold"
          style={{ color: status.startsWith("Error") ? "#CE2033" : "#2D7D46" }}>
          {status}
        </p>
      )}
    </div>
  )
}
