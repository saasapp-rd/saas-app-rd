"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import type { SystemSettings } from "@/lib/systemSettings"

export default function SystemSettingsForm({
  initial,
  canEdit,
}: {
  initial: SystemSettings
  canEdit: boolean
}) {
  const router = useRouter()
  const [vals,    setVals]    = useState<SystemSettings>(initial)
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState("")

  // Track which secret fields have been "revealed" for editing — by default
  // show ••••, only render the cleartext when admin clicks Edit.
  const [revealClientSecret, setRevealClientSecret] = useState(false)
  const [revealApiKey,        setRevealApiKey]      = useState(false)

  function setField<K extends keyof SystemSettings>(k: K, v: SystemSettings[K]) {
    setVals(prev => ({ ...prev, [k]: v }))
    setSaved(false)
  }

  async function save() {
    setSaving(true); setError(""); setSaved(false)
    // Don't post updated_at / updated_by — server overwrites those.
    const { updated_at: _ua, updated_by: _ub, ...payload } = vals
    void _ua; void _ub
    const res = await fetch("/api/admin/system-settings", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    })
    if (res.ok) {
      setSaved(true)
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? "Failed to save.")
    }
    setSaving(false)
  }

  return (
    <div className="flex flex-col gap-5">

      <Section title="School">
        <TextField label="Academic year" value={vals.academic_year}
                   onChange={v => setField("academic_year", v)}
                   placeholder="2025-26" canEdit={canEdit} />
        {/* School name is intentionally hardcoded — this is the
            Seattle Academy app. Shown for context, not editable. */}
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wide mb-1"
             style={{ color: "#3D3D3D", opacity: 0.45 }}>
            School
          </p>
          <p className="text-sm" style={{ color: "#3D3D3D" }}>
            Seattle Academy
          </p>
        </div>
      </Section>

      <Section title="Notification Policy"
               desc="Per-event toggles. When off, the corresponding push or email send is suppressed school-wide.">
        <BoolField label="Push: missing student"
                   value={vals.push_on_missing}
                   onChange={v => setField("push_on_missing", v)}
                   canEdit={canEdit} />
        <BoolField label="Push: elevated incident"
                   value={vals.push_on_elevated}
                   onChange={v => setField("push_on_elevated", v)}
                   canEdit={canEdit} />
        <BoolField label="Push: welfare concern"
                   value={vals.push_on_welfare_concern}
                   onChange={v => setField("push_on_welfare_concern", v)}
                   canEdit={canEdit} />
        <BoolField label="Email: send-home at workflow Step 3"
                   value={vals.email_on_step3}
                   onChange={v => setField("email_on_step3", v)}
                   canEdit={canEdit} />
      </Section>

      <Section title="Google SSO"
               desc="Paste client ID + secret from Google Cloud Console. Empty = SSO disabled (test-mode login only).">
        <TextField label="Client ID" value={vals.google_client_id}
                   onChange={v => setField("google_client_id", v)}
                   placeholder="xxxxx.apps.googleusercontent.com" canEdit={canEdit} mono />
        <SecretField label="Client secret" value={vals.google_client_secret}
                     onChange={v => setField("google_client_secret", v)}
                     reveal={revealClientSecret}
                     onReveal={() => setRevealClientSecret(true)}
                     canEdit={canEdit} />
      </Section>

      <Section title="Veracross Integration"
               desc="API endpoint + key for direct sync. Empty = no auto-sync (manual CSV import still works).">
        <TextField label="API base URL" value={vals.veracross_api_url}
                   onChange={v => setField("veracross_api_url", v)}
                   placeholder="https://api.veracross.com/…" canEdit={canEdit} mono />
        <SecretField label="API key" value={vals.veracross_api_key}
                     onChange={v => setField("veracross_api_key", v)}
                     reveal={revealApiKey}
                     onReveal={() => setRevealApiKey(true)}
                     canEdit={canEdit} />
      </Section>

      {error && (
        <p className="text-xs font-semibold" style={{ color: "#CE2033" }}>{error}</p>
      )}
      {saved && (
        <p className="text-xs font-semibold" style={{ color: "#166534" }}>
          ✓ Settings saved.
        </p>
      )}

      {canEdit && (
        <button onClick={save} disabled={saving}
          className="self-start text-xs font-bold px-4 py-2 rounded-xl text-white"
          style={{
            background: "#A6192E", border: "none", cursor: "pointer",
            opacity: saving ? 0.5 : 1,
          }}>
          {saving ? "Saving…" : "Save settings"}
        </button>
      )}

      {vals.updated_at && (
        <p className="text-[10px]" style={{ color: "#999" }}>
          Last updated {new Date(vals.updated_at).toLocaleString("en-US", {
            month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
          })}
        </p>
      )}
    </div>
  )
}

function Section({ title, desc, children }: {
  title:    string
  desc?:    string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-1"
         style={{ color: "#3D3D3D", opacity: 0.5 }}>
        {title}
      </p>
      {desc && (
        <p className="text-[10px] mb-2" style={{ color: "#999" }}>{desc}</p>
      )}
      <div className="rounded-xl border p-3 flex flex-col gap-3"
           style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
        {children}
      </div>
    </div>
  )
}

function TextField({ label, value, onChange, placeholder, canEdit, mono }: {
  label:        string
  value:        string
  onChange:     (v: string) => void
  placeholder?: string
  canEdit:      boolean
  mono?:        boolean
}) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-wide mb-1"
         style={{ color: "#3D3D3D", opacity: 0.45 }}>
        {label}
      </p>
      {canEdit ? (
        <input value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
          style={{
            borderColor: "#EAEAEA", background: "#fff", color: "#3D3D3D",
            fontFamily: mono ? "monospace" : undefined,
            fontSize: mono ? "11px" : undefined,
          }}
        />
      ) : (
        <p className="text-sm" style={{
              color: value ? "#3D3D3D" : "#BABABA",
              fontFamily: mono ? "monospace" : undefined,
              fontSize: mono ? "11px" : undefined,
              wordBreak: mono ? "break-all" : undefined,
            }}>
          {value || <em>not set</em>}
        </p>
      )}
    </div>
  )
}

function BoolField({ label, value, onChange, canEdit }: {
  label:    string
  value:    boolean
  onChange: (v: boolean) => void
  canEdit:  boolean
}) {
  return (
    <label className="flex items-center justify-between gap-3"
           style={{ cursor: canEdit ? "pointer" : "default" }}>
      <span className="text-xs" style={{ color: "#3D3D3D" }}>{label}</span>
      {canEdit ? (
        <button type="button" onClick={() => onChange(!value)}
          className="text-[10px] font-bold px-3 py-1 rounded-full"
          style={{
            background: value ? "#166534" : "#F4F4F4",
            color:      value ? "#fff"    : "#999",
            border: "none", cursor: "pointer",
          }}>
          {value ? "ON" : "OFF"}
        </button>
      ) : (
        <span className="text-[10px] font-bold px-3 py-1 rounded-full"
              style={{
                background: value ? "#F0FDF4" : "#F4F4F4",
                color:      value ? "#166534" : "#999",
              }}>
          {value ? "ON" : "OFF"}
        </span>
      )}
    </label>
  )
}

/**
 * Secret field — masks the stored value until the editor clicks Reveal.
 * Lets super-admin rotate the secret without ever seeing the old one in
 * the DOM unless they explicitly ask for it.
 */
function SecretField({ label, value, onChange, reveal, onReveal, canEdit }: {
  label:    string
  value:    string
  onChange: (v: string) => void
  reveal:   boolean
  onReveal: () => void
  canEdit:  boolean
}) {
  const hasValue = value.length > 0
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-wide mb-1"
         style={{ color: "#3D3D3D", opacity: 0.45 }}>
        {label}
      </p>
      {canEdit ? (
        reveal ? (
          <input value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="Paste new value, or leave empty to clear"
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
            style={{ borderColor: "#EAEAEA", background: "#fff", color: "#3D3D3D",
                     fontFamily: "monospace", fontSize: "11px" }}
          />
        ) : (
          <div className="flex items-center gap-2">
            <span className="flex-1 text-sm" style={{ color: hasValue ? "#3D3D3D" : "#BABABA",
                                                       fontFamily: "monospace" }}>
              {hasValue ? "••••••••••••" + value.slice(-4) : <em>not set</em>}
            </span>
            <button type="button" onClick={onReveal}
              className="text-[10px] font-bold px-3 py-1 rounded-lg"
              style={{ background: "#EAEAEA", color: "#3D3D3D", border: "none", cursor: "pointer" }}>
              {hasValue ? "Rotate" : "Set"}
            </button>
          </div>
        )
      ) : (
        <p className="text-sm" style={{ color: hasValue ? "#3D3D3D" : "#BABABA",
                                         fontFamily: "monospace", fontSize: "11px" }}>
          {hasValue ? "••••••••••••" + value.slice(-4) : <em>not set</em>}
        </p>
      )}
    </div>
  )
}
