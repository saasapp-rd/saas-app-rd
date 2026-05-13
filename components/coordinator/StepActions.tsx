"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

interface IncidentSteps {
  id:                  string
  level:               string
  suppress_email_home: boolean
  step_1_sent_at:      string | null
  step_2_sent_at:      string | null
  step_3_expires_at:   string | null
  step_4_logged_at:    string | null
  step_5_logged_at:    string | null
  step_6_sent_at:      string | null
  status:              string
  located_location:    string | null
}

function fmtTime(iso: string | null): string {
  if (!iso) return ""
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

export default function StepActions({ incident }: { incident: IncidentSteps }) {
  const router  = useRouter()
  const [loading,   setLoading]   = useState<string | null>(null)
  const [error,     setError]     = useState("")
  const [foundNote, setFoundNote] = useState("")

  const isResolved = incident.status === "resolved"
  const isLocated  = incident.status === "located"
  const isElevated = incident.level  === "elevated"
  const isClosed   = isResolved || isLocated  // steps are locked once student found

  async function doAction(action: string, note?: string) {
    setLoading(action)
    setError("")
    const res = await fetch("/api/coordinator/action", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ incident_id: incident.id, action, note }),
    })
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? "Action failed")
    }
    router.refresh()
    setLoading(null)
  }

  const steps = [
    { num: 1, label: "Contact teacher — verify report",       done: incident.step_1_sent_at,    action: "step_1" },
    { num: 2, label: "Check common areas (bathroom, library)", done: incident.step_2_sent_at,    action: "step_2" },
    { num: 3, label: incident.suppress_email_home ? "Email home — suppressed (Block 1)" : "Send email home to family",
                                                               done: incident.step_3_expires_at, action: "step_3",
              suppressed: incident.suppress_email_home && !incident.step_3_expires_at },
    { num: 4, label: isElevated ? "Full building search — all areas" : "Classroom search — nearby rooms",
                                                               done: incident.step_4_logged_at,  action: "step_4" },
    { num: 5, label: "Notify dean — escalate to elevated",     done: incident.step_5_logged_at,  action: "step_5" },
    { num: 6, label: "Call family directly",                   done: incident.step_6_sent_at,    action: "step_6" },
  ]

  return (
    <div className="flex flex-col gap-3">

      {/* Located banner */}
      {isLocated && !isResolved && (
        <div className="rounded-xl px-4 py-3"
             style={{ background: "#EEF6FF", border: "1px solid #93C5FD" }}>
          <p className="text-xs font-bold" style={{ color: "#1E5FA6" }}>
            ✓ Student located
            {incident.located_location ? " — " + incident.located_location : ""}
          </p>
          <p className="text-[10px] mt-0.5" style={{ color: "#1E5FA6", opacity: 0.7 }}>
            Mark resolved below to close the incident.
          </p>
        </div>
      )}

      {/* Step list */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#EAEAEA" }}>
        {steps.map((step, i) => {
          const isDone       = !!step.done
          const isSuppressed = !!(step as any).suppressed
          const isLoading    = loading === step.action
          // Undone steps are greyed out once student is found or resolved
          const isGreyed     = !isDone && isClosed

          return (
            <div key={step.num}
                 className="px-4 py-3 flex items-center justify-between"
                 style={{
                   background:   isDone ? "#F0FDF4" : isGreyed ? "#F9F9F9" : "#FAFAFA",
                   borderBottom: i < steps.length - 1 ? "1px solid #EAEAEA" : "none",
                   opacity:      isGreyed ? 0.45 : 1,
                 }}>
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                      style={{
                        background: isDone ? "#22C55E" : isGreyed ? "#D1D5DB" : "#EAEAEA",
                        color:      isDone ? "#fff"     : "#999",
                      }}>
                  {isDone ? "✓" : step.num}
                </span>
                <div>
                  <p className="text-xs font-semibold"
                     style={{ color: isDone ? "#166534" : isGreyed ? "#9CA3AF" : "#3D3D3D" }}>
                    {step.label}
                  </p>
                  {isDone && (
                    <p className="text-[10px]" style={{ color: "#16A34A" }}>
                      Done at {fmtTime(step.done)}
                    </p>
                  )}
                </div>
              </div>

              {/* Only show action button when open + not suppressed + not closed */}
              {!isDone && !isClosed && (
                isSuppressed ? (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded"
                        style={{ background: "#FFF8E0", color: "#8B6200" }}>
                    Suppressed
                  </span>
                ) : (
                  <button onClick={() => doAction(step.action)}
                          disabled={!!loading}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-white flex-shrink-0"
                          style={{ background: "#A6192E", opacity: loading ? 0.5 : 1 }}>
                    {isLoading ? "Saving…" : "Mark Done"}
                  </button>
                )
              )}
            </div>
          )
        })}
      </div>

      {error && (
        <p className="text-[10px] font-semibold text-center" style={{ color: "#CE2033" }}>{error}</p>
      )}

      {/* Resolution actions — only shown when open (not yet located/resolved) */}
      {!isClosed && (
        <div className="flex flex-col gap-2">
          <p className="text-[9px] font-bold tracking-[0.25em] uppercase"
             style={{ color: "#3D3D3D", opacity: 0.35 }}>
            Resolution
          </p>
          <input value={foundNote} onChange={e => setFoundNote(e.target.value)}
            placeholder="Where was student found? (optional)"
            className="px-3 py-2 rounded-lg text-sm border outline-none"
            style={{ borderColor: "#EAEAEA", background: "#fff" }} />
          <div className="flex gap-2">
            <button onClick={() => doAction("found", foundNote)} disabled={!!loading}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white"
                    style={{ background: "#A6192E", opacity: loading ? 0.5 : 1 }}>
              {loading === "found" ? "Saving…" : "Student Found"}
            </button>
            <button onClick={() => doAction("with_me", foundNote)} disabled={!!loading}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                    style={{ background: "#EAEAEA", color: "#3D3D3D", opacity: loading ? 0.5 : 1 }}>
              {loading === "with_me" ? "Saving…" : "With Me"}
            </button>
          </div>
          {!isElevated && (
            <button onClick={() => doAction("escalate")} disabled={!!loading}
                    className="w-full py-2 rounded-xl text-xs font-bold"
                    style={{ background: "#FFF0F0", color: "#CE2033", border: "1px solid #CE2033" }}>
              {loading === "escalate" ? "Escalating…" : "Escalate to Elevated"}
            </button>
          )}
        </div>
      )}

      {/* Resolve button — shown when located but not yet resolved */}
      {isLocated && !isResolved && (
        <div className="flex flex-col gap-2">
          <p className="text-[9px] font-bold tracking-[0.25em] uppercase"
             style={{ color: "#3D3D3D", opacity: 0.35 }}>
            Close Incident
          </p>
          <button onClick={() => doAction("resolve")} disabled={!!loading}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white"
                  style={{ background: "#166534", opacity: loading ? 0.5 : 1 }}>
            {loading === "resolve" ? "Closing…" : "Mark Resolved"}
          </button>
        </div>
      )}

      {isResolved && (
        <div className="rounded-xl px-4 py-3 text-center"
             style={{ background: "#F0FDF4", border: "1px solid #22C55E" }}>
          <p className="text-sm font-bold" style={{ color: "#166534" }}>
            ✓ Student Located &amp; Resolved
          </p>
        </div>
      )}
    </div>
  )
}
