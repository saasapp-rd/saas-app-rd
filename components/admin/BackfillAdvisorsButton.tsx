"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

interface Result {
  ok?:           boolean
  updates?:      number
  pass1Added?:   number
  pass2Demoted?: number
  pass3Added?:   number
  message?:      string
  error?:        string
}

export default function BackfillAdvisorsButton() {
  const router = useRouter()
  const [running, setRunning] = useState(false)
  const [result,  setResult]  = useState<Result | null>(null)
  const [confirm, setConfirm] = useState(false)

  async function run() {
    setRunning(true); setResult(null)
    try {
      const res  = await fetch("/api/admin/backfill-advisors", { method: "POST" })
      const data = await res.json()
      setResult(data)
      if (res.ok) router.refresh()
    } catch (e) {
      setResult({ error: (e as Error).message })
    }
    setRunning(false)
    setConfirm(false)
  }

  return (
    <div className="rounded-xl border p-3 flex flex-col gap-2"
         style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
      <p className="text-[9px] font-bold tracking-[0.25em] uppercase"
         style={{ color: "#3D3D3D", opacity: 0.45 }}>
        Maintenance — Reconcile Roles
      </p>
      <p className="text-xs" style={{ color: "#3D3D3D" }}>
        Three sweeps in one pass: anyone assigned an active course gets
        <strong> teacher</strong>; anyone tagged <strong>teacher</strong> with no class is
        demoted to <strong>staff</strong>; advisory (block 9) teachers whose course
        name carries their name pick up <strong>advisor</strong>. Idempotent — safe
        to re-run.
      </p>

      {!confirm ? (
        <button onClick={() => setConfirm(true)} disabled={running}
          className="self-start text-[10px] font-bold px-3 py-1.5 rounded-lg"
          style={{
            background: "#EAEAEA", color: "#3D3D3D",
            border: "none", cursor: "pointer",
          }}>
          Run reconcile
        </button>
      ) : (
        <div className="flex gap-2">
          <button onClick={run} disabled={running}
            className="text-[10px] font-bold px-3 py-1.5 rounded-lg text-white"
            style={{ background: "#A6192E", border: "none", cursor: "pointer",
                     opacity: running ? 0.5 : 1 }}>
            {running ? "Running…" : "Confirm — run now"}
          </button>
          <button onClick={() => setConfirm(false)} disabled={running}
            className="text-[10px] font-bold px-3 py-1.5 rounded-lg"
            style={{ background: "#EAEAEA", color: "#3D3D3D",
                     border: "none", cursor: "pointer" }}>
            Cancel
          </button>
        </div>
      )}

      {result && (
        <div className="rounded-lg px-3 py-2 text-[10px]"
             style={{
               background: result.error ? "#FFF0F0" : "#F0FDF4",
               border:     `1px solid ${result.error ? "#FECACA" : "#86EFAC"}`,
               color:      result.error ? "#A6192E" : "#166534",
             }}>
          {result.error
            ? `Error: ${result.error}`
            : result.message ?? "Done."}
        </div>
      )}
    </div>
  )
}
