"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface TriageCardProps {
  id:          string
  studentName: string
  grade:       number
  blockId:     number | null
  room:        string | null
  minsAgo:     number
  reporter:    string | null
  suppressEmail: boolean
}

const FALSE_POS = [
  { label: "Sports dismissal",  tag: "sports_dismissal"   },
  { label: "Off-campus trip",   tag: "off_campus_trip"    },
  { label: "Accommodations",    tag: "accommodations_room" },
  { label: "Parent signed out", tag: "parent_signed_out"  },
  { label: "Sub error",         tag: "sub_error"          },
]

export default function TriageCard({
  id, studentName, grade, blockId, room, minsAgo, reporter, suppressEmail,
}: TriageCardProps) {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)

  async function markFalsePositive(tag: string) {
    setLoading(true)
    await fetch("/api/coordinator/triage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ incident_id: id, action: "false_positive", context_tag: tag }),
    })
    setDone(true)
    setLoading(false)
    router.refresh()
  }

  if (done) return null

  return (
    <div className="rounded-xl p-3 border" style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-sm font-bold" style={{ color: "#3D3D3D" }}>{studentName}</span>
          <span className="ml-2 text-[10px]" style={{ color: "#999" }}>Gr {grade}</span>
        </div>
        <span className="text-xs font-bold" style={{ color: "#999" }}>
          {minsAgo < 1 ? "just now" : minsAgo + "m ago"}
        </span>
      </div>

      <p className="text-[10px] mb-3" style={{ color: "#999" }}>
        {blockId ? "Block " + blockId : ""}
        {room    ? " · " + room       : ""}
        {reporter ? " · by " + reporter : ""}
        {suppressEmail ? " · No email (Block 1)" : ""}
      </p>

      {/* False positive categories */}
      <p className="text-[8px] font-bold tracking-[0.2em] uppercase mb-1.5"
         style={{ color: "#3D3D3D", opacity: 0.35 }}>
        Mark as false positive
      </p>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {FALSE_POS.map(fp => (
          <button
            key={fp.tag}
            onClick={() => markFalsePositive(fp.tag)}
            disabled={loading}
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
            style={{ background: "#EAEAEA", color: "#3D3D3D", opacity: loading ? 0.5 : 1 }}>
            {fp.label}
          </button>
        ))}
      </div>

      {/* Confirm missing → go to workflow */}
      <Link
        href={"/coordinator/" + id}
        className="w-full block py-2 rounded-lg text-xs font-bold text-white text-center"
        style={{ background: "#A6192E", textDecoration: "none" }}>
        Confirm Missing — Open Workflow &rarr;
      </Link>
    </div>
  )
}
