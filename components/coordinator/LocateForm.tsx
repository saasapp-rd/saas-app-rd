"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function LocateForm({ incidentId }: { incidentId: string }) {
  const router   = useRouter()
  const [loc,     setLoc]     = useState("")
  const [excused, setExcused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState("")
  const [done,    setDone]    = useState(false)

  async function submit() {
    const trimmed = loc.trim()
    if (!trimmed || loading) return
    setLoading(true)
    setError("")

    const res  = await fetch("/api/coordinator/locate", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ incident_id: incidentId, location: trimmed, excused }),
    })
    const data = await res.json()

    if (res.ok) {
      setDone(true)
      router.refresh()
    } else {
      setError(data.error ?? "Failed to save.")
    }
    setLoading(false)
  }

  if (done) {
    return (
      <div className="rounded-xl px-4 py-3 text-center"
           style={{ background: "#F0FDF4", border: "1px solid #22C55E" }}>
        <p className="text-sm font-bold" style={{ color: "#166534" }}>Student located</p>
        <p className="text-xs mt-0.5" style={{ color: "#16A34A" }}>{loc}{excused ? " (excused)" : ""}</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl p-4 border" style={{ background: "#F0FDF4", borderColor: "#22C55E" }}>
      <p className="text-xs font-bold mb-3" style={{ color: "#166534" }}>
        Student found — log location
      </p>

      <div className="flex flex-col gap-3">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wide mb-1 block"
                 style={{ color: "#166534", opacity: 0.7 }}>
            Where was the student found?
          </label>
          <input
            value={loc}
            onChange={e => setLoc(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") submit() }}
            placeholder="e.g. Library, Counselor office, Room 204..."
            className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
            style={{ borderColor: "#22C55E", background: "#fff", color: "#3D3D3D" }}
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={excused}
            onChange={e => setExcused(e.target.checked)}
            className="rounded"
            style={{ accentColor: "#16A34A" }}
          />
          <span className="text-xs" style={{ color: "#166534" }}>Absence was excused</span>
        </label>

        <button
          onClick={submit}
          disabled={loading || !loc.trim()}
          className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
          style={{ background: "#16A34A", opacity: loading || !loc.trim() ? 0.5 : 1 }}>
          {loading ? "Saving…" : "Mark Located"}
        </button>

        {error && (
          <p className="text-[10px] font-semibold" style={{ color: "#CE2033" }}>{error}</p>
        )}
      </div>
    </div>
  )
}
