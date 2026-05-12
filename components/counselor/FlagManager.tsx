"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

interface FlagRow {
  id:          string
  flag_level:  string
  public_note: string | null
  flagged_at:  string
}

const FLAG_STYLE: Record<string, { bg: string; color: string }> = {
  elevated:  { bg: "#FFF0F0", color: "#A6192E" },
  watch:     { bg: "#FFF8E0", color: "#8B6200" },
  emergency: { bg: "#FFE0E0", color: "#7B0000" },
}

export default function FlagManager({
  studentId,
  initialFlags,
}: {
  studentId:    string
  initialFlags: FlagRow[]
}) {
  const router     = useRouter()
  const [flags,    setFlags]    = useState<FlagRow[]>(initialFlags)
  const [adding,   setAdding]   = useState(false)
  const [level,    setLevel]    = useState("watch")
  const [note,     setNote]     = useState("")
  const [saving,   setSaving]   = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error,    setError]    = useState("")

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  async function addFlag() {
    setSaving(true)
    setError("")
    const res  = await fetch("/api/counselor/flag", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ student_id: studentId, flag_level: level, public_note: note }),
    })
    const data = await res.json()
    if (res.ok) {
      setFlags(prev => [data, ...prev])
      setAdding(false)
      setNote("")
      setLevel("watch")
      router.refresh()
    } else {
      setError(data.error ?? "Failed to add flag.")
    }
    setSaving(false)
  }

  async function removeFlag(id: string) {
    setDeleting(id)
    const res = await fetch("/api/counselor/flag?id=" + id, { method: "DELETE" })
    if (res.ok) {
      setFlags(prev => prev.filter(f => f.id !== id))
      router.refresh()
    }
    setDeleting(null)
  }

  return (
    <div className="flex flex-col gap-2">

      {/* Existing flags */}
      {flags.length === 0 && !adding && (
        <p className="text-xs py-2 text-center" style={{ color: "#999" }}>No flags on record.</p>
      )}

      {flags.map(f => (
        <div key={f.id} className="rounded-xl px-4 py-2.5 border flex items-start justify-between"
             style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
          <div className="flex-1 min-w-0 mr-3">
            {f.public_note && (
              <p className="text-xs" style={{ color: "#3D3D3D" }}>{f.public_note}</p>
            )}
            <p className="text-[10px]" style={{ color: "#999" }}>{fmtDate(f.flagged_at)}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase"
                  style={{
                    background: FLAG_STYLE[f.flag_level]?.bg ?? "#EAEAEA",
                    color:      FLAG_STYLE[f.flag_level]?.color ?? "#666",
                  }}>
              {f.flag_level}
            </span>
            <button
              onClick={() => removeFlag(f.id)}
              disabled={deleting === f.id}
              className="text-[10px] font-bold"
              style={{ color: "#CE2033", background: "none", border: "none", cursor: "pointer" }}>
              {deleting === f.id ? "…" : "Remove"}
            </button>
          </div>
        </div>
      ))}

      {/* Add flag form */}
      {adding ? (
        <div className="rounded-xl p-4 border" style={{ borderColor: "#F0C040", background: "#FFFDF0" }}>
          <p className="text-[10px] font-bold uppercase tracking-wide mb-3"
             style={{ color: "#8B6200" }}>Add Concern Flag</p>

          <div className="flex flex-col gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wide mb-1 block"
                     style={{ color: "#8B6200", opacity: 0.8 }}>Level</label>
              <select
                value={level}
                onChange={e => setLevel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm border outline-none"
                style={{ borderColor: "#F0C040", background: "#fff", color: "#3D3D3D" }}>
                <option value="watch">Watch</option>
                <option value="elevated">Elevated</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wide mb-1 block"
                     style={{ color: "#8B6200", opacity: 0.8 }}>Note (optional)</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Context visible to all staff..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl text-sm border outline-none resize-none"
                style={{ borderColor: "#F0C040", background: "#fff", color: "#3D3D3D" }}
              />
            </div>

            {error && (
              <p className="text-[10px] font-semibold" style={{ color: "#CE2033" }}>{error}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={addFlag}
                disabled={saving}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-white"
                style={{ background: "#A6192E", opacity: saving ? 0.5 : 1 }}>
                {saving ? "Saving…" : "Add Flag"}
              </button>
              <button
                onClick={() => { setAdding(false); setError("") }}
                className="flex-1 py-2 rounded-xl text-xs font-bold"
                style={{ background: "#EAEAEA", color: "#3D3D3D" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full py-2 rounded-xl text-xs font-bold border"
          style={{ borderColor: "#EAEAEA", color: "#A6192E", background: "#FAFAFA" }}>
          + Add Concern Flag
        </button>
      )}
    </div>
  )
}
