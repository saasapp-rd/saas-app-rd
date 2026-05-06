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
}

function fmtTime(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
}

export default function StepActions({ incident }: { incident: IncidentSteps }) {
  const router  = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [foundNote, setFoundNote] = useState("")

  const isResolved = incident.status === "resolved" || incident.status === "false_positive"

  async function doAction(action: string, note?: string) {
    setLoading(action)
    await fetch("/api/coordinator/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ incident_id: incident.id, action, note }),
    })
    router.refresh()
    setLoading(null)
  }

  const steps = [
    {
      num:    1,
      label:  "Contact teacher — verify report",
      done:   incident.step_1_sent_at,
      action: "step_1",
    },
    {
      num:    2,
      label:  "Check common areas (bathroom, library, office)",
      done:   incident.step_2_sent_at,
      action: "step_2",
    },
    {
      num:    3,
      label:  incident.suppress_email_home
                ? "Email home — suppressed (Block 1 absence)"
                : "Send email home to family",
      done:   incident.step_3_expires_at,
      action: "step_3",
      suppressed: incident.suppress_email_home && !incident.step_3_expires_at,
    },
    {
      num:    4,
      label:  "Physical search — walk building",
      done:   incident.step_4_logged_at,
      action: "step_4",
    },
    {
      num:    5,
      label:  "Notify dean — escalate to elevated",
      done:   incident.step_5_logged_at,
      action: "step_5",
    },
    {
      num:    6,
      label:  "Call family directly",
      done:   incident.step_6_sent_at,
      action: "step_6",
    },
  ]

  return (
    <div className="flex flex-col gap-3">
      {/* Step list */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: "#EAEAEA" }}>
        {steps.map((step, i) => {
          const isDone      = !!step.done
          const isSuppressed = !!(step as { suppressed?: boolean }).suppressed
          const isLoading   = loading === step.action

          return (
            <div
              key={step.num}
              className="px-4 py-3 flex items-center justify-between"
              style={{
                background:   isDone ? "#F0FDF4" : "#FAFAFA",
                borderBottom: i < steps.length - 1 ? "1px solid #EAEAEA" : "none",
              }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                  style={{
                    background: isDone ? "#22C55E" : "#EAEAEA",
                    color:      isDone ? "#fff"     : "#999",
                  }}
                >
                  {isDone ? "✓" : step.num}
                </span>
                <div>
                  <p className="text-xs font-semibold" style={{ color: isDone ? "#166534" : "#3D3D3D" }}>
                    {step.label}
                  </p>
                  {isDone && (
                    <p className="text-[10px]" style={{ color: "#16A34A" }}>
                      Done at {fmtTime(step.done)}
                    </p>
                  )}
                </div>
              </div>

              {!isDone && !isResolved && (
                isSuppressed ? (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded"
                        style={{ background: "#FFF8E0", color: "#8B6200" }}>
                    Suppressed
                  </span>
                ) : (
                  <button
                    onClick={() => doAction(step.action)}
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

      {/* Resolution actions */}
      {!isResolved && (
        <div className="flex flex-col gap-2">
          <p className="text-[9px] font-bold tracking-[0.25em] uppercase"
             style={{ color: "#3D3D3D", opacity: 0.35 }}>
            Resolution
          </p>

          <input
            value={foundNote}
            onChange={e => setFoundNote(e.target.value)}
            placeholder="Where was student found? (optional)"
            className="px-3 py-2 rounded-lg text-sm border outline-none"
            style={{ borderColor: "#EAEAEA", background: "#fff" }}
          />

          <div className="flex gap-2">
            <button
              onClick={() => doAction("found", foundNote)}
              disabled={!!loading}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white"
              style={{ background: "#A6192E", opacity: loading ? 0.5 : 1 }}>
              {loading === "found" ? "Saving…" : "Student Found"}
            </button>
            <button
              onClick={() => doAction("with_me")}
              disabled={!!loading}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold"
              style={{ background: "#EAEAEA", color: "#3D3D3D", opacity: loading ? 0.5 : 1 }}>
              {loading === "with_me" ? "Saving…" : "With Me"}
            </button>
          </div>

          {incident.level !== "elevated" && (
            <button
              onClick={() => doAction("escalate")}
              disabled={!!loading}
              className="w-full py-2 rounded-xl text-xs font-bold"
              style={{ background: "#FFF0F0", color: "#CE2033", border: "1px solid #CE2033" }}>
              {loading === "escalate" ? "Escalating…" : "Escalate to Elevated"}
            </button>
          )}
        </div>
      )}

      {isResolved && (
        <div className="rounded-xl px-4 py-3 text-center"
             style={{ background: "#F0FDF4", border: "1px solid #22C55E" }}>
          <p className="text-sm font-bold" style={{ color: "#166534" }}>Incident Resolved</p>
        </div>
      )}
    </div>
  )
}
