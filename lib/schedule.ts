import { db } from './supabase'

// ── Block rotation ─────────────────────────────────────────────────────────────
// Day 1: blocks 1,3,5,7  |  Day 2: blocks 2,4,6,8
// Day 3: blocks 7,5,3,1  |  Day 4: blocks 8,6,4,2

export const DAY_SCHEDULE: Record<number, number[]> = {
  1: [1, 3, 5, 7],
  2: [2, 4, 6, 8],
  3: [7, 5, 3, 1],
  4: [8, 6, 4, 2],
}

// ── Period windows (24h times) ─────────────────────────────────────────────────
export const PERIODS = [
  { type: 'block'     as const, position: 1, start: '08:15', end: '09:30' },
  { type: 'block'     as const, position: 2, start: '09:40', end: '10:55' },
  { type: 'lunch'     as const, position: null, start: '10:55', end: '11:40' },
  { type: 'block'     as const, position: 3, start: '11:40', end: '12:55' },
  { type: 'community' as const, position: null, start: '12:55', end: '13:45' },
  { type: 'block'     as const, position: 4, start: '13:45', end: '15:00' },
]

export type PeriodType = 'block' | 'lunch' | 'community' | 'outside_school'

export interface CurrentPeriod {
  type: PeriodType
  position: number | null       // 1–4 if block, null otherwise
  blockNumber: number | null    // actual block number (1–8), null if not a block
  dayType: number | null        // 1–4 from school_calendar
  isSchoolDay: boolean
  periodStart: string | null
  periodEnd: string | null
}

// ── Time helpers ───────────────────────────────────────────────────────────────
function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function nowTimeString(): string {
  const now = new Date()
  const h = now.getHours().toString().padStart(2, '0')
  const m = now.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

function todayDateString(): string {
  const now = new Date()
  return now.toISOString().split('T')[0]  // YYYY-MM-DD
}

// ── Main: get current period ───────────────────────────────────────────────────
export async function getCurrentPeriod(): Promise<CurrentPeriod> {
  const today = todayDateString()

  // Look up today in school_calendar
  const { data: cal } = await db
    .from('school_calendar')
    .select('day_type, is_school_day')
    .eq('date', today)
    .single()

  if (!cal || !cal.is_school_day) {
    return {
      type: 'outside_school',
      position: null,
      blockNumber: null,
      dayType: cal?.day_type ?? null,
      isSchoolDay: false,
      periodStart: null,
      periodEnd: null,
    }
  }

  const dayType: number = cal.day_type
  const blocks = DAY_SCHEDULE[dayType] ?? []
  const nowMins = timeToMinutes(nowTimeString())

  for (const period of PERIODS) {
    const startMins = timeToMinutes(period.start)
    const endMins   = timeToMinutes(period.end)

    if (nowMins >= startMins && nowMins < endMins) {
      const blockNumber =
        period.type === 'block' && period.position !== null
          ? (blocks[period.position - 1] ?? null)
          : null

      return {
        type: period.type,
        position: period.position,
        blockNumber,
        dayType,
        isSchoolDay: true,
        periodStart: period.start,
        periodEnd: period.end,
      }
    }
  }

  // Between periods or after school
  return {
    type: 'outside_school',
    position: null,
    blockNumber: null,
    dayType,
    isSchoolDay: true,
    periodStart: null,
    periodEnd: null,
  }
}

// ── Get block number from day type + position ──────────────────────────────────
export function getBlockNumber(dayType: number, position: number): number | null {
  return DAY_SCHEDULE[dayType]?.[position - 1] ?? null
}

// ── Get all blocks for a given day type ───────────────────────────────────────
export function getBlocksForDay(dayType: number): number[] {
  return DAY_SCHEDULE[dayType] ?? []
}

// ── Is Block 1 of the day? (used for email suppression) ───────────────────────
export function isFirstBlockOfDay(dayType: number, blockNumber: number): boolean {
  return DAY_SCHEDULE[dayType]?.[0] === blockNumber
}
