"use client"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"

interface Note {
  id:         string
  body:       string
  created_at: string
  author:     { display_name: string } | null
}

export default function NoteThread({
  incidentId,
  initialNotes,
}: {
  incidentId:   string
  initialNotes: Note[]
}) {
  const router   = useRouter()
  const [notes,   setNotes]   = useState<Note[]>(initialNotes)
  const [body,    setBody]    = useState("")
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when new note arrives
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [notes.length])

  async function submit() {
    const trimmed = body.trim()
    if (!trimmed || loading) return
    setLoading(true)
    setError("")

    const res = await fetch("/api/coordinator/note", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ incident_id: incidentId, body: trimmed }),
    })
    const data = await res.json()

    if (res.ok) {
      setNotes(prev => [...prev, data])
      setBody("")
      router.refresh()
    } else {
      setError(data.error ?? "Failed to save note.")
    }
    setLoading(false)
  }

  function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit",
    })
  }

  return (
    <div className="flex flex-col gap-2">

      {/* Timeline */}
      {notes.length > 0 && (
        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
          {notes.map(n => (
            <div key={n.id} className="rounded-xl px-3 py-2.5"
                 style={{ background: "#F8F8F8", border: "1px solid #EAEAEA" }}>
              <p className="text-xs" style={{ color: "#3D3D3D" }}>{n.body}</p>
              <p className="text-[9px] mt-1" style={{ color: "#999" }}>
                {n.author?.display_name ?? "Staff"} &middot; {fmtTime(n.created_at)}
              </p>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {notes.length === 0 && (
        <p className="text-[10px] text-center py-3" style={{ color: "#BABABA" }}>
          No notes yet. Add one below.
        </p>
      )}

      {/* Add note */}
      <div className="flex gap-2">
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit() } }}
          placeholder="Add a note… (Enter to save)"
          rows={2}
          className="flex-1 px-3 py-2 rounded-xl text-sm border outline-none resize-none"
          style={{ borderColor: "#EAEAEA", background: "#FAFAFA", color: "#3D3D3D" }}
        />
        <button
          onClick={submit}
          disabled={loading || !body.trim()}
          className="px-4 rounded-xl text-xs font-bold text-white self-end pb-2 pt-2"
          style={{ background: "#A6192E", opacity: loading || !body.trim() ? 0.4 : 1 }}>
          {loading ? "…" : "Save"}
        </button>
      </div>

      {error && (
        <p className="text-[10px] font-semibold" style={{ color: "#CE2033" }}>{error}</p>
      )}
    </div>
  )
}
