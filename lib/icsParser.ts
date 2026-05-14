// Minimal iCalendar parser for the school's daily-block feed.
// Handles all-day VEVENT entries. SUMMARY values like "Odd 1 Block Schedule"
// are mapped to day_type 1–4; anything else is treated as a special day.

export interface IcsEvent {
  summary:   string
  startDate: string  // YYYY-MM-DD
}

export function parseIcs(text: string): IcsEvent[] {
  // RFC 5545 line folding: a CRLF followed by space/tab continues the previous line.
  const unfolded = text.replace(/\r?\n[ \t]/g, "")
  const lines    = unfolded.split(/\r?\n/)

  const events: IcsEvent[] = []
  let current: { summary?: string; startDate?: string } | null = null

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {}
    } else if (line === "END:VEVENT") {
      if (current?.summary && current?.startDate) {
        events.push({ summary: current.summary, startDate: current.startDate })
      }
      current = null
    } else if (current) {
      if (line.startsWith("SUMMARY:")) {
        current.summary = line.slice("SUMMARY:".length).trim()
      } else if (line.startsWith("SUMMARY;")) {
        const colon = line.indexOf(":")
        if (colon > -1) current.summary = line.slice(colon + 1).trim()
      } else if (line.startsWith("DTSTART")) {
        const colon = line.indexOf(":")
        if (colon > -1) {
          const value    = line.slice(colon + 1).trim()
          const datePart = value.slice(0, 8)
          if (datePart.length === 8 && /^\d{8}$/.test(datePart)) {
            current.startDate =
              `${datePart.slice(0,4)}-${datePart.slice(4,6)}-${datePart.slice(6,8)}`
          }
        }
      }
    }
  }
  return events
}

export interface ClassifiedDay {
  dayType:   number | null   // 1–4 if rotation day, null otherwise
  isSpecial: boolean
}

// "Odd 1 Block Schedule" → 1, "Even 2 Block Schedule" → 2, etc.
// Everything else (assessments, performances, "SPECIAL SCHEDULE") → special.
export function classifyDayType(summary: string): ClassifiedDay {
  const s = summary.toLowerCase()
  if (s.includes("odd 1 block"))  return { dayType: 1, isSpecial: false }
  if (s.includes("even 2 block")) return { dayType: 2, isSpecial: false }
  if (s.includes("odd 7 block"))  return { dayType: 3, isSpecial: false }
  if (s.includes("even 8 block")) return { dayType: 4, isSpecial: false }
  return { dayType: null, isSpecial: true }
}
