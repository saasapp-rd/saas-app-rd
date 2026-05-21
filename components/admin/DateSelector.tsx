"use client"
import { useRouter } from "next/navigation"

/**
 * Compact date picker for the analytics Today tab. Renders:
 *   [‹]  [native date input]  [›]  [Today]
 * Each control navigates to /analytics?tab=today&date=YYYY-MM-DD,
 * keeping page-level data fetching on the server.
 */
export default function DateSelector({
  selectedDate,
  todayIso,
  basePath = "/analytics",
  tab      = "today",
}: {
  selectedDate: string   // YYYY-MM-DD
  todayIso:     string   // YYYY-MM-DD
  basePath?:    string
  tab?:         string
}) {
  const router = useRouter()
  const sel = parseISODate(selectedDate)

  function nav(date: string) {
    router.push(`${basePath}?tab=${tab}&date=${date}`)
  }

  const prevIso = formatISODate(addDays(sel, -1))
  const nextIso = formatISODate(addDays(sel,  1))
  const isToday = selectedDate === todayIso

  // Block forward navigation past today — there's no incident data
  // in the future, and admin almost never wants to land there by
  // accident.
  const nextDisabled = selectedDate >= todayIso

  return (
    <div className="rounded-xl border flex items-center gap-2 p-2"
         style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
      <button onClick={() => nav(prevIso)}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-base font-black"
        style={{ background: "#fff", border: "1px solid #EAEAEA",
                 color: "#3D3D3D", cursor: "pointer" }}
        aria-label="Previous day">
        ‹
      </button>

      <input type="date"
        value={selectedDate}
        max={todayIso}
        onChange={e => { if (e.target.value) nav(e.target.value) }}
        className="flex-1 px-3 py-1.5 rounded-lg text-sm border outline-none"
        style={{ background: "#fff", borderColor: "#EAEAEA", color: "#3D3D3D" }}
      />

      <button onClick={() => !nextDisabled && nav(nextIso)}
        disabled={nextDisabled}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-base font-black"
        style={{
          background: "#fff",
          border: "1px solid #EAEAEA",
          color: nextDisabled ? "#BABABA" : "#3D3D3D",
          cursor: nextDisabled ? "default" : "pointer",
          opacity: nextDisabled ? 0.5 : 1,
        }}
        aria-label="Next day">
        ›
      </button>

      <button onClick={() => nav(todayIso)} disabled={isToday}
        className="text-[10px] font-bold px-3 py-1.5 rounded-lg flex-shrink-0"
        style={{
          background: isToday ? "#EAEAEA" : "#A6192E",
          color:      isToday ? "#999"    : "#fff",
          border: "none",
          cursor: isToday ? "default" : "pointer",
        }}>
        Today
      </button>
    </div>
  )
}

function parseISODate(s: string): Date {
  // Force local-time interpretation so "2026-05-21" doesn't become a UTC
  // date that's still yesterday in PST.
  const [y, m, d] = s.split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

function formatISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d)
  out.setDate(out.getDate() + n)
  return out
}
