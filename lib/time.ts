const TZ = 'America/Los_Angeles'

/** YYYY-MM-DD for today in Pacific time */
export function todayPacific(): string {
  // 'en-CA' locale formats dates as YYYY-MM-DD
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ })
}

/** Format an ISO timestamp as a 12-hour time string in Pacific time (e.g. "9:45 AM") */
export function fmtTimePacific(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    timeZone:  TZ,
    hour:      'numeric',
    minute:    '2-digit',
  })
}

/** Format a YYYY-MM-DD date string as a display label in Pacific time */
export function fmtDateLabelPacific(
  date: string,
  opts: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' }
): string {
  // Use noon UTC so DST shifts never cross the date boundary
  return new Date(date + 'T12:00:00Z').toLocaleDateString('en-US', { timeZone: TZ, ...opts })
}

/** Day-of-week index (0 = Sun … 6 = Sat) for an ISO timestamp in Pacific time */
export function pacificDayOfWeek(iso: string): number {
  const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'long' }).format(new Date(iso))
  return DAYS.indexOf(wd)
}

/**
 * Returns the UTC ISO string for midnight Pacific on a YYYY-MM-DD date.
 * Handles both PST (UTC-8) and PDT (UTC-7) automatically.
 * e.g. "2024-05-21" → "2024-05-21T07:00:00.000Z" during PDT
 */
export function pacificDayStartUTC(date: string): string {
  // Probe: at noon UTC on this date, what Pacific hour is it?
  // PDT (UTC-7): noon UTC = 5am Pacific  → offset = 5 - 12 = -7
  // PST (UTC-8): noon UTC = 4am Pacific  → offset = 4 - 12 = -8
  const probe = new Date(`${date}T12:00:00Z`)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(probe)
  const pacificHour = parseInt(parts.find(p => p.type === 'hour')!.value)
  const offsetH = pacificHour - 12          // e.g. 5-12 = -7
  const utcStartH = String(-offsetH).padStart(2, '0')  // "07" or "08"
  return new Date(`${date}T${utcStartH}:00:00.000Z`).toISOString()
}

/**
 * Returns the UTC ISO string for 23:59:59 Pacific on a YYYY-MM-DD date.
 */
export function pacificDayEndUTC(date: string): string {
  const start = new Date(pacificDayStartUTC(date))
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1000).toISOString()
}
