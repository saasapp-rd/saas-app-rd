"use client"
import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export interface DataIssue {
  id:          string
  source:      string
  kind:        string
  ref_type:    string | null
  ref_id:      string | null
  title:       string
  details:     Record<string, unknown> | null
  status:      "open" | "resolved" | "dismissed"
  created_at:  string
  resolved_at: string | null
  notes:       string | null
}

const KIND_LABEL: Record<string, string> = {
  block_overlay:        "Block Overlay",
  course_needs_review:  "Course Needs Review",
  missing_course:       "Missing Course",
  missing_teacher:      "Missing Teacher",
}

const KIND_COLOR: Record<string, { bg: string; color: string }> = {
  block_overlay:        { bg: "#FFF8E0", color: "#8B6200" },
  course_needs_review:  { bg: "#FFF0F0", color: "#A6192E" },
  missing_course:       { bg: "#FFF0F0", color: "#A6192E" },
  missing_teacher:      { bg: "#EEF6FF", color: "#1E5FA6" },
}

/**
 * Map an issue to the page where admin can fix it. Returns null if no
 * actionable destination — e.g. the underlying row was deleted.
 */
function fixHref(issue: DataIssue): { href: string; label: string } | null {
  if (issue.kind === "block_overlay" && issue.ref_type === "user" && issue.ref_id) {
    return { href: `/students/${issue.ref_id}`, label: "Fix in schedule →" }
  }
  if (issue.kind === "course_needs_review") {
    const classId = issue.details?.class_id
    if (typeof classId === "string" && classId.length > 0) {
      return { href: `/admin/courses?search=${encodeURIComponent(classId)}`, label: "Fix course →" }
    }
    if (issue.ref_id) {
      return { href: `/admin/courses?needs_review=1`, label: "Fix course →" }
    }
  }
  // Generic fallbacks by ref_type
  if (issue.ref_type === "user"   && issue.ref_id) return { href: `/students/${issue.ref_id}`,    label: "Open student →" }
  if (issue.ref_type === "course" && issue.ref_id) return { href: `/admin/courses`,               label: "Open courses →" }
  return null
}

const TABS = [
  { value: "open",      label: "Open"      },
  { value: "resolved",  label: "Resolved"  },
  { value: "dismissed", label: "Dismissed" },
] as const

type Tab = typeof TABS[number]["value"]

export default function ReviewQueue({ issues }: { issues: DataIssue[] }) {
  const router = useRouter()
  const [tab,    setTab]    = useState<Tab>("open")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>("all")

  const counts = useMemo(() => ({
    open:      issues.filter(i => i.status === "open").length,
    resolved:  issues.filter(i => i.status === "resolved").length,
    dismissed: issues.filter(i => i.status === "dismissed").length,
  }), [issues])

  const kinds = useMemo(() => {
    const set = new Set(issues.filter(i => i.status === tab).map(i => i.kind))
    return [...set].sort()
  }, [issues, tab])

  const visible = issues.filter(i => i.status === tab && (filter === "all" || i.kind === filter))

  async function setStatus(id: string, status: "open" | "resolved" | "dismissed") {
    setBusyId(id)
    const res = await fetch("/api/admin/issues", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id, status }),
    })
    if (res.ok) router.refresh()
    setBusyId(null)
  }

  return (
    <div className="flex flex-col gap-3">

      {/* Tabs */}
      <div className="flex gap-1.5">
        {TABS.map(t => (
          <button key={t.value} onClick={() => { setTab(t.value); setFilter("all") }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold"
            style={{
              background: tab === t.value ? "#3D3D3D" : "#F4F4F4",
              color:      tab === t.value ? "#fff"    : "#999",
              border: "none", cursor: "pointer",
            }}>
            {t.label} ({counts[t.value]})
          </button>
        ))}
      </div>

      {/* Kind filter chips */}
      {kinds.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setFilter("all")}
            className="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
            style={{
              background: filter === "all" ? "#3D3D3D" : "#F4F4F4",
              color:      filter === "all" ? "#fff"    : "#999",
              border: "none", cursor: "pointer",
            }}>
            All
          </button>
          {kinds.map(k => {
            const sty = KIND_COLOR[k] ?? { bg: "#F4F4F4", color: "#999" }
            const sel = filter === k
            return (
              <button key={k} onClick={() => setFilter(k)}
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{
                  background: sel ? sty.color : sty.bg,
                  color:      sel ? "#fff"    : sty.color,
                  border: "none", cursor: "pointer",
                }}>
                {KIND_LABEL[k] ?? k}
              </button>
            )
          })}
        </div>
      )}

      {/* List */}
      {visible.length === 0 ? (
        <p className="text-xs text-center py-8" style={{ color: "#999" }}>
          {tab === "open" ? "No open issues — all clear." : `No ${tab} issues.`}
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {visible.map(issue => {
            const sty = KIND_COLOR[issue.kind] ?? { bg: "#F4F4F4", color: "#999" }
            return (
              <div key={issue.id} className="rounded-xl border p-3"
                   style={{ borderColor: "#EAEAEA", background: "#FAFAFA" }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase"
                        style={{ background: sty.bg, color: sty.color }}>
                    {KIND_LABEL[issue.kind] ?? issue.kind}
                  </span>
                  <span className="text-[10px]" style={{ color: "#999" }}>
                    {issue.source}
                  </span>
                </div>
                <p className="text-xs font-semibold mb-2" style={{ color: "#3D3D3D" }}>
                  {issue.title}
                </p>
                {issue.details && Object.keys(issue.details).length > 0 && (
                  <details className="mb-2">
                    <summary className="text-[10px] cursor-pointer" style={{ color: "#999" }}>
                      Details
                    </summary>
                    <pre className="text-[10px] mt-1 p-2 rounded"
                         style={{ background: "#fff", border: "1px solid #EAEAEA",
                                  color: "#3D3D3D", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                      {JSON.stringify(issue.details, null, 2)}
                    </pre>
                  </details>
                )}
                {issue.notes && (
                  <p className="text-[10px] italic mb-2" style={{ color: "#666" }}>
                    Note: {issue.notes}
                  </p>
                )}
                {(() => { const fix = fixHref(issue); return (
                <div className="flex flex-col gap-1.5">
                  {issue.status === "open" && fix && (
                    <Link href={fix.href}
                      className="text-center py-1.5 rounded-lg text-[10px] font-bold"
                      style={{
                        background: "#EEF6FF", color: "#1E5FA6",
                        border: "1px solid #BFD7F2", textDecoration: "none",
                      }}>
                      {fix.label}
                    </Link>
                  )}
                  <div className="flex gap-2">
                    {issue.status === "open" ? (
                      <>
                        <button onClick={() => setStatus(issue.id, "resolved")}
                          disabled={busyId === issue.id}
                          className="flex-1 py-1.5 rounded-lg text-[10px] font-bold text-white"
                          style={{ background: "#166534", border: "none", cursor: "pointer",
                                   opacity: busyId === issue.id ? 0.5 : 1 }}>
                          Mark Resolved
                        </button>
                        <button onClick={() => setStatus(issue.id, "dismissed")}
                          disabled={busyId === issue.id}
                          className="flex-1 py-1.5 rounded-lg text-[10px] font-bold"
                          style={{ background: "#EAEAEA", color: "#3D3D3D", border: "none", cursor: "pointer",
                                   opacity: busyId === issue.id ? 0.5 : 1 }}>
                          Dismiss
                        </button>
                      </>
                    ) : (
                      <button onClick={() => setStatus(issue.id, "open")}
                        disabled={busyId === issue.id}
                        className="flex-1 py-1.5 rounded-lg text-[10px] font-bold"
                        style={{ background: "#FFF8E0", color: "#8B6200", border: "1px solid #FDE68A",
                                 cursor: "pointer", opacity: busyId === issue.id ? 0.5 : 1 }}>
                        Reopen
                      </button>
                    )}
                  </div>
                </div>
                )})()}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
