"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function ResolveButton({ incidentId }: { incidentId: string }) {
  const router   = useRouter()
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)
  const [error,   setError]   = useState("")

  async function resolve() {
    if (loading) return
    setLoading(true)
    setError("")

    const res  = await fetch("/api/coordinator/action", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ incident_id: incidentId, action: "resolve" }),
    })
    const data = await res.json()

    if (res.ok) {
      setDone(true)
      router.refresh()
    } else {
      setError(data.error ?? "Failed to resolve.")
    }
    setLoading(false)
  }

  if (done) {
    return (
      <div className="rounded-xl px-4 py-3 text-center"
           style={{ background: "#F0FDF4", border: "1px solid #22C55E" }}>
        <p className="text-sm font-bold" style={{ color: "#166534" }}>Student located &amp; resolved</p>
        <p className="text-xs mt-0.5" style={{ color: "#16A34A" }}>All-clear sent to teachers</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={resolve}
        disabled={loading}
        className="w-full py-3 rounded-xl text-sm font-bold text-white"
        style={{ background: "#166534", opacity: loading ? 0.5 : 1 }}>
        {loading ? "Closing…" : "Close & Send All-Clear"}
      </button>
      {error && (
        <p className="text-[10px] font-semibold" style={{ color: "#CE2033" }}>{error}</p>
      )}
    </div>
  )
}
