import { db } from "@/lib/supabase"

interface IncidentRow {
  id:               string
  level:            string
  status:           string
  report_type:      string
  reported_at:      string
  resolved_at:      string | null
  located_location: string | null
  located_excused:  boolean | null
  block_id:         number | null
  student:          { first_name: string; last_name: string; grade: number } | null
  reporter:         { display_name: string } | null
}

export default async function DailyPrintPage() {
  const today    = new Date().toISOString().split("T")[0]
  const todayStr = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  })

  const { data: incidents } = await db
    .from("incidents")
    .select("id, level, status, report_type, reported_at, resolved_at, located_location, located_excused, block_id, student:student_id(first_name, last_name, grade), reporter:reported_by(display_name)")
    .gte("reported_at", today + "T00:00:00+00:00")
    .lte("reported_at", today + "T23:59:59+00:00")
    .order("reported_at", { ascending: true })

  const rows = (incidents ?? []) as unknown as IncidentRow[]

  function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  }

  function duration(r: IncidentRow): string {
    if (!r.resolved_at) return "—"
    const ms = new Date(r.resolved_at).getTime() - new Date(r.reported_at).getTime()
    const m  = Math.round(ms / 60000)
    return m < 1 ? "<1 min" : m + " min"
  }

  return (
    <html>
      <head>
        <title>Daily Missing Students Report — {todayStr}</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 11px; color: #111; padding: 24px 32px; }
          h1 { font-size: 16px; font-weight: 900; margin-bottom: 2px; }
          .sub { font-size: 10px; color: #666; margin-bottom: 16px; }
          .stats { display: flex; gap: 24px; margin-bottom: 20px; padding-bottom: 12px; border-bottom: 1px solid #EAEAEA; }
          .stat { }
          .stat-num { font-size: 22px; font-weight: 900; line-height: 1; }
          .stat-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; }
          table { width: 100%; border-collapse: collapse; }
          th { text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; padding: 6px 8px; border-bottom: 1px solid #EAEAEA; }
          td { padding: 7px 8px; border-bottom: 1px solid #F4F4F4; vertical-align: top; }
          .elevated { color: #A6192E; font-weight: bold; }
          .resolved { color: #166534; }
          .open { color: #8B6200; }
          .located { color: #1E5FA6; }
          @media print { body { padding: 0; } }
        `}</style>
      </head>
      <body>
        <h1>Daily Missing Students Report</h1>
        <div className="sub">Seattle Academy &mdash; {todayStr}</div>

        <div className="stats">
          <div className="stat">
            <div className="stat-num">{rows.length}</div>
            <div className="stat-label">Total</div>
          </div>
          <div className="stat">
            <div className="stat-num" style={{ color: rows.filter(r => r.status === "open").length > 0 ? "#CE2033" : "#111" }}>
              {rows.filter(r => r.status === "open").length}
            </div>
            <div className="stat-label">Open</div>
          </div>
          <div className="stat">
            <div className="stat-num" style={{ color: rows.filter(r => r.level === "elevated").length > 0 ? "#CE2033" : "#111" }}>
              {rows.filter(r => r.level === "elevated").length}
            </div>
            <div className="stat-label">Elevated</div>
          </div>
          <div className="stat">
            <div className="stat-num" style={{ color: "#166534" }}>
              {rows.filter(r => r.status === "resolved").length}
            </div>
            <div className="stat-label">Resolved</div>
          </div>
        </div>

        {rows.length === 0 ? (
          <p style={{ color: "#999", textAlign: "center", padding: "32px" }}>
            No missing students recorded today.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Gr</th>
                <th>Time</th>
                <th>Blk</th>
                <th>Level</th>
                <th>Status</th>
                <th>Found At</th>
                <th>Duration</th>
                <th>Reported By</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>
                    {r.student ? r.student.last_name + ", " + r.student.first_name : "Unknown"}
                  </td>
                  <td>{r.student?.grade ?? "?"}</td>
                  <td>{fmtTime(r.reported_at)}</td>
                  <td>{r.block_id ?? "—"}</td>
                  <td className={r.level === "elevated" ? "elevated" : ""}>{r.level}</td>
                  <td className={r.status === "resolved" ? "resolved" : r.status === "open" ? "open" : "located"}>
                    {r.status}
                  </td>
                  <td>
                    {r.located_location
                      ? r.located_location + (r.located_excused ? " (excused)" : "")
                      : "—"}
                  </td>
                  <td>{duration(r)}</td>
                  <td style={{ color: "#666" }}>{r.reporter?.display_name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </body>
    </html>
  )
}
