"use client"
import { useState, FormEvent } from "react"
import { useRouter } from "next/navigation"

interface Coordinator { id: string; display_name: string }
interface Assignment   { block_number: number; coordinator_id: string; users: { display_name: string } | null }

export default function CoordinatorForm({
  coordinators,
  assignments,
}: {
  coordinators: Coordinator[]
  assignments:  Assignment[]
}) {
  const router = useRouter()
  const [block,   setBlock]   = useState("")
  const [coordId, setCoordId] = useState("")
  const [status,  setStatus]  = useState("")
  const [loading, setLoading] = useState(false)

  const assignedMap = Object.fromEntries(
    assignments.map(a => [a.block_number, a.coordinator_id])
  )

  function onBlockChange(b: string) {
    setBlock(b)
    // Pre-fill with current coordinator if one exists
    const existing = assignedMap[Number(b)]
    setCoordId(existing ?? "")
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true); setStatus("")
    const res = await fetch("/api/admin/coordinators", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ block_number: Number(block), coordinator_id: coordId }),
    })
    if (res.ok) {
      setStatus("Block " + block + " assigned.")
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
        Assign Coordinator to Block
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <select value={block} onChange={e => onBlockChange(e.target.value)} required
            className="px-3 py-2 rounded-lg text-sm border outline-none" style={inputStyle}>
            <option value="">Block...</option>
            {[1,2,3,4,5,6,7,8].map(b => <option key={b} value={b}>Block {b}</option>)}
          </select>
          <select value={coordId} onChange={e => setCoordId(e.target.value)} required
            className="px-3 py-2 rounded-lg text-sm border outline-none" style={inputStyle}>
            <option value="">Coordinator...</option>
            {coordinators.map(c => <option key={c.id} value={c.id}>{c.display_name}</option>)}
          </select>
        </div>
        <button type="submit" disabled={loading}
          className="py-2 rounded-lg text-xs font-bold text-white"
          style={{ background: "#A6192E", opacity: loading ? 0.6 : 1 }}>
          {loading ? "Saving..." : "Save Assignment"}
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
