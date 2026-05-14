"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

interface Coordinator { id: string; display_name: string }
export interface Assignment {
  block_number:   number
  coordinator_id: string
  name:           string
}

const BLOCKS = [1,2,3,4,5,6,7,8]

export default function CoordinatorBlocks({
  coordinators,
  assignments,
}: {
  coordinators: Coordinator[]
  assignments:  Assignment[]
}) {
  const router = useRouter()
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [error,   setError]   = useState("")

  const byBlock = new Map<number, Assignment[]>()
  for (const a of assignments) {
    const list = byBlock.get(a.block_number) ?? []
    list.push(a)
    byBlock.set(a.block_number, list)
  }

  async function add(block: number, coordId: string) {
    if (!coordId) return
    const key = `${block}:${coordId}`
    setBusyKey(key); setError("")
    const res = await fetch("/api/admin/coordinators", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ block_number: block, coordinator_id: coordId }),
    })
    if (res.ok) router.refresh()
    else { const d = await res.json(); setError(d.error ?? "Failed to assign.") }
    setBusyKey(null)
  }

  async function remove(block: number, coordId: string) {
    const key = `${block}:${coordId}`
    setBusyKey(key); setError("")
    const res = await fetch("/api/admin/coordinators", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ block_number: block, coordinator_id: coordId }),
    })
    if (res.ok) router.refresh()
    else { const d = await res.json(); setError(d.error ?? "Failed to remove.") }
    setBusyKey(null)
  }

  return (
    <div className="flex flex-col gap-2">

      <div className="rounded-xl px-4 py-3 text-[10px]"
           style={{ background: "#FFFBEB", border: "1px solid #FDE68A", color: "#78350F" }}>
        These are the <strong>global defaults</strong>. Multiple coordinators can cover the
        same block. Per-day swaps will be managed on the school calendar (coming soon).
      </div>

      {BLOCKS.map(b => {
        const assigned    = byBlock.get(b) ?? []
        const assignedIds = new Set(assigned.map(a => a.coordinator_id))
        const available   = coordinators.filter(c => !assignedIds.has(c.id))
        return (
          <div key={b} className="rounded-xl border p-3"
               style={{ borderColor: "#EAEAEA", background: "#FAFAFA" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold" style={{ color: "#3D3D3D" }}>Block {b}</span>
              <span className="text-[10px]"
                    style={{ color: assigned.length === 0 ? "#CE2033" : "#999" }}>
                {assigned.length === 0
                  ? "No coordinators assigned"
                  : `${assigned.length} coordinator${assigned.length === 1 ? "" : "s"}`}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {assigned.map(a => {
                const key = `${b}:${a.coordinator_id}`
                return (
                  <span key={a.coordinator_id}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5"
                        style={{ background: "#EEF6FF", color: "#1E5FA6" }}>
                    {a.name}
                    <button onClick={() => remove(b, a.coordinator_id)}
                            disabled={busyKey === key}
                            className="text-[12px] leading-none"
                            style={{
                              background: "none", border: "none", color: "#1E5FA6",
                              cursor: "pointer", padding: 0,
                              opacity: busyKey === key ? 0.4 : 1,
                            }}>
                      ✕
                    </button>
                  </span>
                )
              })}
              {available.length > 0 ? (
                <select value=""
                        onChange={e => { if (e.target.value) add(b, e.target.value) }}
                        disabled={busyKey?.startsWith(`${b}:`)}
                        className="text-[11px] px-2.5 py-1 rounded-full border outline-none"
                        style={{ borderColor: "#EAEAEA", background: "#fff", color: "#999", cursor: "pointer" }}>
                  <option value="">+ Add coordinator</option>
                  {available.map(c => (
                    <option key={c.id} value={c.id}>{c.display_name}</option>
                  ))}
                </select>
              ) : assigned.length > 0 && (
                <span className="text-[10px]" style={{ color: "#BABABA" }}>
                  All coordinators assigned
                </span>
              )}
            </div>
          </div>
        )
      })}

      {error && (
        <p className="text-xs font-semibold" style={{ color: "#CE2033" }}>{error}</p>
      )}
    </div>
  )
}
