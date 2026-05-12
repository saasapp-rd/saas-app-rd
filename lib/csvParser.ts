/** Shared CSV parsing utilities for admin import routes. */

/** Parse CSV text → array of {header: value} rows. BOM-safe, quoted-field-safe. */
export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/)
  const nonEmpty = lines.map(l => l.trim()).filter(Boolean)
  if (nonEmpty.length < 2) return []

  const headers = splitLine(nonEmpty[0]).map(h =>
    h.trim().toLowerCase().replace(/[\s\-\/]+/g, "_").replace(/[^a-z0-9_]/g, ""))

  return nonEmpty.slice(1).map(line => {
    const vals = splitLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = (vals[i] ?? "").trim() })
    return row
  }).filter(r => Object.values(r).some(v => v !== ""))
}

function splitLine(line: string): string[] {
  const res: string[] = []; let cur = ""; let q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (q && line[i + 1] === '"') { cur += '"'; i++ } else q = !q
    } else if (c === "," && !q) {
      res.push(cur); cur = ""
    } else { cur += c }
  }
  return [...res, cur]
}

/** Return first non-empty value among the aliased column names. */
export function col(row: Record<string, string>, ...aliases: string[]): string {
  for (const a of aliases) {
    const v = row[a]
    if (v !== undefined && v.trim() !== "") return v.trim()
  }
  return ""
}

/** Normalise phone to (xxx) xxx-xxxx or return trimmed raw value. */
export function normalizePhone(raw: string): string | null {
  if (!raw.trim()) return null
  const d = raw.replace(/\D/g, "")
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  if (d.length === 11 && d[0] === "1") return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`
  return raw.trim()
}
