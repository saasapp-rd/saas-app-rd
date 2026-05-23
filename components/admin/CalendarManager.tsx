"use client"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export interface DayRow {
  date:          string
  day_type:      number | null
  is_school_day: boolean
  is_special:    boolean
  note:          string | null
  source:        string | null
}

const DAY_LABEL: Record<number, string> = { 1: "D1 · Odd 1", 2: "D2 · Even 2", 3: "D3 · Odd 7", 4: "D4 · Even 8" }
const DAY_COLOR: Record<number, string> = { 1: "#E8F4FD", 2: "#FFF8E0", 3: "#F0FDF4", 4: "#FFF0F5" }
const DAY_TEXT:  Record<number, string> = { 1: "#1A6FA6", 2: "#8B6200", 3: "#166534", 4: "#A6192E" }
const DAY_BLOCKS: Record<number, string> = { 1: "1,3,5,7", 2: "2,4,6,8", 3: "7,5,3,1", 4: "8,6,4,2" }

interface SyncResult {
  synced?:         number
  special?:        number
  skipped_manual?: number
  total_events?:   number
  error?:          string
}

export default function CalendarManager({
  year,
  month,           // 1-12
  rows,
  prevHref,
  nextHref,
  canEdit = true,
}: {
  year:     number
  month:    number
  rows:     DayRow[]
  prevHref: string
  nextHref: string
  canEdit?: boolean
}) {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [syncing,      setSyncing]      = useState(false)
  const [syncResult,   setSyncResult]   = useState<SyncResult | null>(null)

  const calMap = Object.fromEntries(rows.map(r => [r.date, r]))
  const today  = new Date().toISOString().split("T")[0]

  const firstDayOfWeek = new Date(year, month - 1, 1).getDay()
  const totalDays      = new Date(year, month, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const monthName = new Date(year, month - 1, 1).toLocaleString("default", { month: "long" })
  const selectedRow: DayRow | undefined = selectedDate ? calMap[selectedDate] : undefined

  async function syncFromFeed() {
    setSyncing(true); setSyncResult(null)
    try {
      const res  = await fetch("/api/admin/calendar/sync", { method: "POST" })
      const data = await res.json()
      setSyncResult(data)
      if (res.ok) router.refresh()
    } catch (e) {
      setSyncResult({ error: (e as Error).message })
    }
    setSyncing(false)
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Sync row — admin/super_admin only */}
      {canEdit && (
        <div className="rounded-xl border p-3 flex items-center justify-between gap-3"
             style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold" style={{ color: "#3D3D3D" }}>
              Sync from school feed
            </p>
            <p className="text-[10px]" style={{ color: "#999" }}>
              Pulls day types and special schedules from Seattle Academy&apos;s calendar feed.
              Manual overrides are preserved.
            </p>
          </div>
          <button onClick={syncFromFeed} disabled={syncing}
            className="px-3 py-2 rounded-xl text-xs font-bold text-white flex-shrink-0"
            style={{ background: "#A6192E", opacity: syncing ? 0.5 : 1, border: "none", cursor: "pointer" }}>
            {syncing ? "Syncing…" : "Sync now"}
          </button>
        </div>
      )}

      {/* Read-only notice */}
      {!canEdit && (
        <div className="rounded-xl border p-3 text-[10px]"
             style={{ background: "#F4F4F4", borderColor: "#EAEAEA", color: "#666" }}>
          Read-only view. Day types and special schedules are managed by an
          administrator.
        </div>
      )}

      {syncResult && !syncResult.error && (
        <p className="text-xs" style={{ color: "#166534" }}>
          ✓ Synced {syncResult.synced} days
          {syncResult.special ? ` · ${syncResult.special} special` : ""}
          {syncResult.skipped_manual ? ` · ${syncResult.skipped_manual} manual edits preserved` : ""}
        </p>
      )}
      {syncResult?.error && (
        <p className="text-xs" style={{ color: "#CE2033" }}>Error: {syncResult.error}</p>
      )}

      {/* Month nav */}
      <div className="flex items-center justify-between">
        <Link href={prevHref} className="text-xs font-bold px-3 py-1.5 rounded-lg"
              style={{ background: "#F4F4F4", color: "#3D3D3D", textDecoration: "none" }}>
          ← Prev
        </Link>
        <div className="text-sm font-bold" style={{ color: "#3D3D3D" }}>
          {monthName} {year}
        </div>
        <Link href={nextHref} className="text-xs font-bold px-3 py-1.5 rounded-lg"
              style={{ background: "#F4F4F4", color: "#3D3D3D", textDecoration: "none" }}>
          Next →
        </Link>
      </div>

      {/* Legend */}
      <div className="flex gap-1.5 flex-wrap">
        {[1,2,3,4].map(d => (
          <span key={d} className="text-[9px] font-bold px-2 py-0.5 rounded"
                style={{ background: DAY_COLOR[d], color: DAY_TEXT[d] }}>
            {DAY_LABEL[d]} ({DAY_BLOCKS[d]})
          </span>
        ))}
        <span className="text-[9px] font-bold px-2 py-0.5 rounded"
              style={{ background: "#FFFBEB", color: "#92400E", border: "1px solid #FDE68A" }}>
          ★ Special
        </span>
        <span className="text-[9px] font-bold px-2 py-0.5 rounded"
              style={{ background: "#F3F4F6", color: "#999" }}>
          No school
        </span>
      </div>

      {/* Unified 7-column calendar grid — inline styles to bypass Tailwind JIT */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        borderLeft:  "1px solid #EAEAEA",
        borderTop:   "1px solid #EAEAEA",
      }}>

        {/* Day-of-week header row */}
        {(["Sun","Mon","Tue","Wed","Thu","Fri","Sat"] as const).map(d => (
          <div key={d} style={{
            textAlign:      "center",
            fontSize:       9,
            fontWeight:     700,
            textTransform:  "uppercase",
            letterSpacing:  "0.1em",
            padding:        "6px 2px",
            color:          "#3D3D3D",
            opacity:        0.4,
            background:     "#FAFAFA",
            borderRight:    "1px solid #EAEAEA",
            borderBottom:   "1px solid #EAEAEA",
          }}>
            {d}
          </div>
        ))}

        {/* Date cells */}
        {cells.map((day, i) => {
          /* Empty leading/trailing cells */
          if (!day) return (
            <div key={i} style={{
              minHeight:   68,
              background:  "#fff",
              borderRight: "1px solid #EAEAEA",
              borderBottom:"1px solid #EAEAEA",
            }} />
          )

          const dateStr   = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`
          const row       = calMap[dateStr]
          const isToday   = dateStr === today
          const isSel     = dateStr === selectedDate
          const dt        = row?.day_type
          const isSchool  = row?.is_school_day ?? false
          const isSpecial = row?.is_special ?? false
          const isManual  = row?.source === "manual"

          let bg = "#fff"
          if (row && isSchool) {
            if (isSpecial) bg = "#FFFBEB"
            else if (dt)   bg = DAY_COLOR[dt]
          } else if (row && !isSchool) {
            bg = "#F4F4F4"
          }

          const outline = isSel   ? "inset 0 0 0 2px #1E5FA6"
                        : isToday ? "inset 0 0 0 2px #A6192E"
                        : "none"

          return (
            <button
              key={i}
              onClick={() => setSelectedDate(dateStr)}
              style={{
                position:    "relative",
                display:     "flex",
                flexDirection:"column",
                alignItems:  "flex-start",
                padding:     "5px 4px 4px",
                minHeight:   68,
                width:       "100%",
                background:  bg,
                boxShadow:   outline,
                cursor:      "pointer",
                border:      "none",
                borderRight: "1px solid #EAEAEA",
                borderBottom:"1px solid #EAEAEA",
                textAlign:   "left",
              }}>

              {/* Date number — top-left */}
              <span style={{
                fontSize:   11,
                fontWeight: 700,
                lineHeight: 1,
                color:      isToday ? "#A6192E" : "#3D3D3D",
              }}>
                {day}
              </span>

              {/* Day-type / status — centered vertically in remaining space */}
              <span style={{
                flex:       1,
                display:    "flex",
                alignItems: "center",
                justifyContent: "center",
                width:      "100%",
                fontSize:   12,
                fontWeight: 900,
                color:      dt && isSchool && !isSpecial ? DAY_TEXT[dt]
                          : isSpecial ? "#92400E"
                          : "#BABABA",
              }}>
                {dt && isSchool && !isSpecial && `D${dt}`}
                {isSpecial && "★"}
                {row && !isSchool && "off"}
              </span>

              {/* Manual-override badge — top-right */}
              {isManual && (
                <span style={{
                  position:   "absolute",
                  top:        3,
                  right:      3,
                  fontSize:   7,
                  fontWeight: 700,
                  padding:    "1px 3px",
                  borderRadius: 3,
                  background: "#1E5FA6",
                  color:      "#fff",
                }}>
                  M
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Day editor — admin/super_admin can save; others get a read-only view */}
      {selectedDate && (
        <DayEditor
          dateStr={selectedDate}
          row={selectedRow}
          canEdit={canEdit}
          onClose={() => setSelectedDate(null)}
          onSaved={() => { setSelectedDate(null); router.refresh() }}
        />
      )}

      {rows.length === 0 && !selectedDate && canEdit && (
        <p className="text-xs text-center mt-2" style={{ color: "#999" }}>
          No calendar data for this month. Click <strong>Sync now</strong> to pull from the feed,
          or click a day to enter it manually.
        </p>
      )}
    </div>
  )
}

function DayEditor({
  dateStr, row, canEdit, onClose, onSaved,
}: {
  dateStr: string
  row:     DayRow | undefined
  canEdit: boolean
  onClose: () => void
  onSaved: () => void
}) {
  const [dayType,     setDayType]     = useState<number | null>(row?.day_type ?? null)
  const [isSchoolDay, setIsSchoolDay] = useState<boolean>(row?.is_school_day ?? true)
  const [isSpecial,   setIsSpecial]   = useState<boolean>(row?.is_special ?? false)
  const [note,        setNote]        = useState<string>(row?.note ?? "")
  const [saving,      setSaving]      = useState(false)
  const [resetting,   setResetting]   = useState(false)
  const [error,       setError]       = useState("")

  const dateDisplay = new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  })

  async function save() {
    setSaving(true); setError("")
    const body: Record<string, unknown> = {
      date:          dateStr,
      is_school_day: isSchoolDay,
      is_special:    isSchoolDay ? isSpecial : false,
      note:          note.trim() || null,
    }
    body.day_type = isSchoolDay && !isSpecial ? dayType : null
    const res = await fetch("/api/admin/calendar", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    })
    if (res.ok) onSaved()
    else { const d = await res.json(); setError(d.error ?? "Failed."); setSaving(false) }
  }

  async function resetToSync() {
    setResetting(true); setError("")
    const res = await fetch("/api/admin/calendar", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ date: dateStr }),
    })
    if (res.ok) onSaved()
    else { const d = await res.json(); setError(d.error ?? "Failed."); setResetting(false) }
  }

  return (
    <div className="rounded-xl border p-4 flex flex-col gap-3"
         style={{ background: "#FFF8F8", borderColor: "#A6192E" }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold" style={{ color: "#3D3D3D" }}>{dateDisplay}</p>
        <button onClick={onClose}
          className="text-[10px] font-bold px-2 py-1 rounded-lg"
          style={{ background: "#EAEAEA", color: "#3D3D3D", border: "none", cursor: "pointer" }}>
          ✕
        </button>
      </div>

      {/* School day toggle */}
      <div className="flex gap-2">
        <button onClick={() => setIsSchoolDay(true)}
          className="flex-1 py-2 rounded-xl text-xs font-bold"
          style={{
            background: isSchoolDay ? "#3D3D3D" : "#F4F4F4",
            color:      isSchoolDay ? "#fff"    : "#999",
            border: "none", cursor: "pointer",
          }}>
          School day
        </button>
        <button onClick={() => setIsSchoolDay(false)}
          className="flex-1 py-2 rounded-xl text-xs font-bold"
          style={{
            background: !isSchoolDay ? "#3D3D3D" : "#F4F4F4",
            color:      !isSchoolDay ? "#fff"    : "#999",
            border: "none", cursor: "pointer",
          }}>
          No school
        </button>
      </div>

      {/* Special toggle (only when school day) */}
      {isSchoolDay && (
        <button onClick={() => setIsSpecial(s => !s)}
          className="w-full py-2 rounded-xl text-xs font-bold"
          style={{
            background: isSpecial ? "#FFFBEB" : "#F4F4F4",
            color:      isSpecial ? "#92400E" : "#999",
            border:     isSpecial ? "1px solid #FDE68A" : "none",
            cursor: "pointer",
          }}>
          {isSpecial ? "★ Special schedule" : "Normal rotation day"}
        </button>
      )}

      {/* Day-type chips (only when school day + not special) */}
      {isSchoolDay && !isSpecial && (
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wide mb-1.5"
             style={{ color: "#3D3D3D", opacity: 0.4 }}>Day type</p>
          <div className="grid grid-cols-2 gap-1.5">
            {[1,2,3,4].map(d => (
              <button key={d} onClick={() => setDayType(d)}
                className="py-2 rounded-xl text-xs font-bold"
                style={{
                  background: dayType === d ? DAY_TEXT[d]  : DAY_COLOR[d],
                  color:      dayType === d ? "#fff"        : DAY_TEXT[d],
                  border:     "none", cursor: "pointer",
                  opacity:    dayType === d ? 1 : 0.7,
                }}>
                {DAY_LABEL[d]} ({DAY_BLOCKS[d]})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Note */}
      <div>
        <p className="text-[9px] font-bold uppercase tracking-wide mb-1"
           style={{ color: "#3D3D3D", opacity: 0.4 }}>
          Note {isSpecial && <span style={{ color: "#92400E" }}>(describe the special schedule)</span>}
        </p>
        <input value={note} onChange={e => setNote(e.target.value)}
          placeholder={isSpecial ? "e.g. Culminating Assessments" : "Optional note"}
          className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
          style={{ borderColor: "#EAEAEA", background: "#fff", color: "#3D3D3D" }} />
      </div>

      {error && <p className="text-xs font-semibold" style={{ color: "#CE2033" }}>{error}</p>}

      {canEdit && (
        <>
          <button onClick={save}
            disabled={saving || (isSchoolDay && !isSpecial && !dayType)}
            className="w-full py-2 rounded-xl text-sm font-bold text-white"
            style={{
              background: "#A6192E",
              opacity: saving || (isSchoolDay && !isSpecial && !dayType) ? 0.5 : 1,
              border: "none", cursor: "pointer",
            }}>
            {saving ? "Saving…" : "Save (manual override)"}
          </button>

          {row?.source === "manual" && (
            <button onClick={resetToSync} disabled={resetting}
              className="w-full py-1.5 rounded-xl text-[10px] font-bold"
              style={{ background: "transparent", color: "#999", border: "1px solid #EAEAEA", cursor: "pointer" }}>
              {resetting ? "Resetting…" : "Reset — let next sync repopulate"}
            </button>
          )}
        </>
      )}
    </div>
  )
}
