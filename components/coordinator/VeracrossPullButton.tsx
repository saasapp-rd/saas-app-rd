"use client"
import { useState } from "react"

/**
 * Placeholder button — Veracross attendance sync isn't wired yet.
 * The endpoint will fetch today's absentee list from Veracross, match
 * against active students, and open incidents for unaccounted-for
 * students. For now the button shows a friendly "not yet wired"
 * message so the UX is in place when the integration lands.
 */
export default function VeracrossPullButton() {
  const [shown, setShown] = useState(false)

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#EAEAEA" }}>
      <div className="px-4 py-2.5 border-b" style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
        <p className="text-[9px] font-bold uppercase tracking-[0.2em]"
           style={{ color: "#3D3D3D", opacity: 0.45 }}>
          Veracross Sync
        </p>
      </div>
      <div className="px-4 py-3" style={{ background: "#fff" }}>
        <button
          onClick={() => setShown(true)}
          className="w-full rounded-xl px-4 py-3 flex items-center gap-3 text-left"
          style={{ background: "#EEF6FF", border: "1px solid #BFD7F2", cursor: "pointer" }}>
          <span className="text-lg">⬇️</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold" style={{ color: "#1E5FA6" }}>
              Pull Missing Students from Veracross
            </p>
            <p className="text-[10px]" style={{ color: "#3B82F6" }}>
              Sync today&apos;s absentee list and auto-open cases
            </p>
          </div>
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                style={{ background: "#FFF8E0", color: "#8B6200" }}>
            Soon
          </span>
        </button>

        {shown && (
          <div className="mt-2 rounded-lg px-3 py-2 text-[10px]"
               style={{
                 background: "#FFFBEB", border: "1px solid #FDE68A", color: "#78350F",
               }}>
            Veracross integration isn&apos;t wired yet. Once super-admin enters API
            credentials in System Settings and the sync endpoint is built,
            clicking this will pull today&apos;s absentee list and auto-open
            missing-student cases for unaccounted students.
            <button onClick={() => setShown(false)}
              className="block mt-1 text-[10px] font-bold"
              style={{ background: "none", border: "none", color: "#78350F",
                       cursor: "pointer", padding: 0, textDecoration: "underline" }}>
              Got it
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
