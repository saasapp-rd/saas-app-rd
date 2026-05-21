"use client"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export interface IncidentRow {
  id:               string
  level:            string
  status:           string
  report_type:      string
  reported_at:      string
  resolved_at:      string | null
  located_location: string | null
  located_excused:  boolean | null
  block_id:         number | null
  reporter:         { display_name: string | null } | { display_name: string | null }[] | null
}

const LEVEL_STYLE: Record<string, { bg: string; color: string }> = {
  routine:   { bg: "#EAEAEA", color: "#3D3D3D" },
  elevated:  { bg: "#FFF0F0", color: "#A6192E" },
  emergency: { bg: "#FFE0E0", color: "#7B0000" },
}
const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  open:     { bg: "#FFF8E0", color: "#8B6200", label: "Open"     },
  located:  { bg: "#EEF6FF", color: "#1E5FA6", label: "Located"  },
  resolved: { bg: "#F0FDF4", color: "#166534", label: "Resolved" },
}

function reporterName(r: IncidentRow["reporter"]): string | null {
  if (!r) return null
  const obj = Array.isArray(r) ? r[0] : r
  return obj?.display_name ?? null
}

export default function IncidentDrilldown({
  studentId,
  studentName,
  incidents,
  canDelete,
}: {
  studentId:   string
  studentName: string
  incidents:   IncidentRow[]
  canDelete:   boolean
}) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [error, setError] = useState("")

  // ───────────── Aggregates ─────────────
  const stats = useMemo(() => {
    const now      = Date.now()
    const thirtyMs = 30  * 86400000
    const ninetyMs = 90  * 86400000

    // Welfare concerns are tracked but excluded from the missing-student totals.
    const missing = incidents.filter(i => i.report_type !== "welfare_concern")
    const welfare = incidents.filter(i => i.report_type === "welfare_concern")

    const last30  = missing.filter(i => now - new Date(i.reported_at).getTime() < thirtyMs).length
    const last90  = missing.filter(i => now - new Date(i.reported_at).getTime() < ninetyMs).length
    const elev    = missing.filter(i => i.level === "elevated").length
    const open    = missing.filter(i => i.status === "open").length
    const located = missing.filter(i => i.status === "located" || i.status === "resolved").length
    const lastDate = missing[0]?.reported_at ?? null
    return { total: missing.length, last30, last90, elev, open, located, lastDate, welfareCount: welfare.length }
  }, [incidents])

  // Last 12 calendar months — even empty months render a zero bar so
  // the chart axis stays consistent.
  const monthBins = useMemo(() => {
    const now  = new Date()
    const bins: { key: string; label: string; count: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      const label = d.toLocaleDateString("en-US", { month: "short" })
      bins.push({ key, label, count: 0 })
    }
    const byKey = new Map(bins.map(b => [b.key, b]))
    for (const i of incidents) {
      if (i.report_type === "welfare_concern") continue
      const d = new Date(i.reported_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      const b = byKey.get(key)
      if (b) b.count++
    }
    return bins
  }, [incidents])
  const maxMonth = Math.max(1, ...monthBins.map(b => b.count))

  // Per-block distribution (1-9, plus "?" for null).
  const blockBins = useMemo(() => {
    const counts = new Map<number | "?", number>()
    for (const i of incidents) {
      if (i.report_type === "welfare_concern") continue
      const k = (i.block_id ?? "?") as number | "?"
      counts.set(k, (counts.get(k) ?? 0) + 1)
    }
    const out: { label: string; count: number }[] = []
    for (let b = 1; b <= 9; b++) {
      out.push({ label: b === 9 ? "Adv" : `B${b}`, count: counts.get(b) ?? 0 })
    }
    if ((counts.get("?") ?? 0) > 0) out.push({ label: "?", count: counts.get("?") ?? 0 })
    return out
  }, [incidents])
  const maxBlock = Math.max(1, ...blockBins.map(b => b.count))

  async function doDelete(id: string) {
    setDeleting(id); setError("")
    const res = await fetch("/api/admin/incidents", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id }),
    })
    if (res.ok) {
      router.refresh()
      setConfirmId(null)
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? "Failed to delete.")
    }
    setDeleting(null)
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    })
  }
  function fmtDateTime(iso: string) {
    return new Date(iso).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit",
    })
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Stat tiles */}
      <div className="grid grid-cols-3 gap-2">
        <StatTile label="Total"     value={stats.total} />
        <StatTile label="Last 30 d" value={stats.last30} />
        <StatTile label="Last 90 d" value={stats.last90} />
        <StatTile label="Elevated"  value={stats.elev}   alarm={stats.elev > 0} />
        <StatTile label="Still Open" value={stats.open}  alarm={stats.open > 0} />
        <StatTile label="Located"   value={stats.located} />
      </div>

      {stats.lastDate && (
        <p className="text-[10px]" style={{ color: "#999" }}>
          Most recent: <span style={{ color: "#3D3D3D" }}>{fmtDateTime(stats.lastDate)}</span>
        </p>
      )}

      {/* Monthly bar chart */}
      <div>
        <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
           style={{ color: "#3D3D3D", opacity: 0.35 }}>
          Last 12 Months
        </p>
        <div className="flex items-end gap-1 rounded-xl border p-3"
             style={{ borderColor: "#EAEAEA", background: "#FAFAFA", height: 120 }}>
          {monthBins.map(b => {
            const h = Math.round((b.count / maxMonth) * 80)
            return (
              <div key={b.key} className="flex-1 flex flex-col items-center justify-end gap-1"
                   title={`${b.label}: ${b.count}`}>
                <span className="text-[8px] font-bold" style={{ color: b.count > 0 ? "#A6192E" : "#BABABA" }}>
                  {b.count || ""}
                </span>
                <div style={{
                  width: "100%",
                  height: `${h}px`,
                  background: b.count > 0 ? "#A6192E" : "#EAEAEA",
                  borderRadius: "2px 2px 0 0",
                  minHeight: b.count > 0 ? 2 : 1,
                }} />
                <span className="text-[8px]" style={{ color: "#999" }}>{b.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Block distribution */}
      <div>
        <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-2"
           style={{ color: "#3D3D3D", opacity: 0.35 }}>
          By Block
        </p>
        <div className="flex items-end gap-1 rounded-xl border p-3"
             style={{ borderColor: "#EAEAEA", background: "#FAFAFA", height: 100 }}>
          {blockBins.map(b => {
            const h = Math.round((b.count / maxBlock) * 60)
            return (
              <div key={b.label} className="flex-1 flex flex-col items-center justify-end gap-1"
                   title={`${b.label}: ${b.count}`}>
                <span className="text-[8px] font-bold" style={{ color: b.count > 0 ? "#A6192E" : "#BABABA" }}>
                  {b.count || ""}
                </span>
                <div style={{
                  width: "100%",
                  height: `${h}px`,
                  background: b.count > 0 ? "#A6192E" : "#EAEAEA",
                  borderRadius: "2px 2px 0 0",
                  minHeight: b.count > 0 ? 2 : 1,
                }} />
                <span className="text-[8px]" style={{ color: "#999" }}>{b.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Per-row delete list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[9px] font-bold tracking-[0.25em] uppercase"
             style={{ color: "#3D3D3D", opacity: 0.35 }}>
            All Missing Students — {incidents.length}
            {stats.welfareCount > 0 ? ` (${stats.welfareCount} welfare)` : ""}
          </p>
        </div>

        {incidents.length === 0 ? (
          <div className="rounded-xl px-4 py-8 text-center border"
               style={{ borderColor: "#EAEAEA", background: "#FAFAFA" }}>
            <p className="text-sm font-bold mb-1" style={{ color: "#3D3D3D" }}>No missing students on record.</p>
            <p className="text-xs" style={{ color: "#999" }}>{studentName} has a clean attendance record.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {incidents.map(inc => {
              const lvl       = LEVEL_STYLE[inc.level]  ?? LEVEL_STYLE["routine"]
              const sta       = STATUS_STYLE[inc.status] ?? STATUS_STYLE["open"]
              const isWelfare = inc.report_type === "welfare_concern"
              const isBusy    = deleting === inc.id
              const confirming = confirmId === inc.id

              return (
                <div key={inc.id}
                     className="rounded-xl px-4 py-3 border flex items-center gap-3"
                     style={{
                       background:  isWelfare              ? "#FFFBEB"
                                  : inc.level === "elevated" ? "#FFF8F8"
                                  :                            "#FAFAFA",
                       borderColor: isWelfare              ? "#FDE68A"
                                  : inc.level === "elevated" ? "#FFCCCC"
                                  :                            "#EAEAEA",
                       borderLeft:  "3px solid " + (
                                  isWelfare              ? "#F0C040"
                                  : inc.level === "elevated" ? "#CE2033"
                                  :                            "#BABABA"
                                ),
                     }}>
                  <Link href={`/coordinator/${inc.id}`}
                        className="flex-1 min-w-0"
                        style={{ textDecoration: "none" }}>
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      {isWelfare ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                              style={{ background: "#FEF3C7", color: "#8B6200" }}>
                          Welfare Concern
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                              style={{ background: lvl.bg, color: lvl.color }}>
                          {inc.level}
                        </span>
                      )}
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                            style={{ background: sta.bg, color: sta.color }}>{sta.label}</span>
                      <span className="text-[10px]" style={{ color: "#999" }}>
                        {fmtDate(inc.reported_at)}
                        {inc.block_id ? ` · Blk ${inc.block_id}` : ""}
                        {reporterName(inc.reporter) ? ` · ${reporterName(inc.reporter)}` : ""}
                      </span>
                    </div>
                    {inc.located_location && (
                      <p className="text-[10px]" style={{ color: "#16A34A" }}>
                        Found: {inc.located_location}{inc.located_excused ? " (excused)" : ""}
                      </p>
                    )}
                  </Link>

                  {canDelete && (
                    confirming ? (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => doDelete(inc.id)} disabled={isBusy}
                          className="text-[10px] font-bold px-2 py-1 rounded-lg text-white"
                          style={{ background: "#CE2033", border: "none", cursor: "pointer",
                                   opacity: isBusy ? 0.5 : 1 }}>
                          {isBusy ? "…" : "Confirm"}
                        </button>
                        <button onClick={() => setConfirmId(null)} disabled={isBusy}
                          className="text-[10px] font-bold px-2 py-1 rounded-lg"
                          style={{ background: "#EAEAEA", color: "#3D3D3D",
                                   border: "none", cursor: "pointer" }}>
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmId(inc.id)}
                        className="text-[10px] font-bold px-2 py-1 rounded-lg flex-shrink-0"
                        style={{
                          background: "#FFF0F0", color: "#CE2033",
                          border: "1px solid #FECACA", cursor: "pointer",
                        }}>
                        Delete
                      </button>
                    )
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {error && (
        <p className="text-[10px] font-semibold text-center" style={{ color: "#CE2033" }}>{error}</p>
      )}
    </div>
  )
}

function StatTile({ label, value, alarm }: {
  label: string
  value: number
  alarm?: boolean
}) {
  const isAlarm = alarm && value > 0
  return (
    <div className="rounded-xl p-3 text-center"
         style={{
           background: isAlarm ? "#FFF0F0" : "#F7F7F7",
           border:     `1px solid ${isAlarm ? "#FECACA" : "#EAEAEA"}`,
         }}>
      <div className="text-2xl font-black leading-tight"
           style={{ color: isAlarm ? "#CE2033" : "#3D3D3D" }}>
        {value}
      </div>
      <div className="text-[9px] font-bold uppercase tracking-wide"
           style={{ color: isAlarm ? "#CE2033" : "#999", opacity: isAlarm ? 1 : 0.5 }}>
        {label}
      </div>
    </div>
  )
}
