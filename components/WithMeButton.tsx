"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function WithMeButton({ incidentId }: { incidentId: string }) {
  const router = useRouter()
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle")

  async function handleClick() {
    setStatus("loading")
    try {
      const res = await fetch("/api/coordinator/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incident_id: incidentId, action: "with_me" }),
      })
      if (res.ok) {
        setStatus("done")
        router.refresh()
      } else {
        setStatus("error")
      }
    } catch {
      setStatus("error")
    }
  }

  if (status === "done")
    return <span className="text-[10px] font-bold" style={{ color: "#16A34A" }}>&#x2713; With you</span>

  return (
    <button
      onClick={handleClick}
      disabled={status === "loading"}
      className="px-3 py-1.5 rounded-lg text-[10px] font-bold"
      style={{
        background: status === "error" ? "#FFF0F0" : "#EAEAEA",
        color:      status === "error" ? "#CE2033" : "#3D3D3D",
        opacity: status === "loading" ? 0.6 : 1,
      }}>
      {status === "loading" ? "Saving…" : status === "error" ? "Try again" : "With Me"}
    </button>
  )
}
