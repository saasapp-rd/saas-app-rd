import { NextResponse }                  from "next/server"
import { getServerSession }              from "next-auth"
import { authOptions }                   from "@/lib/auth"
import { getCurrentPeriod, PERIODS }     from "@/lib/schedule"
import { todayPacific, periodEndToUTC }  from "@/lib/time"

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

/**
 * GET /api/schedule/now
 * Returns the current period info with computed UTC timestamps and
 * minutes-remaining, for use by the check-in modal's "< 10 min" prompt.
 * Accessible to any authenticated non-student role.
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role === "student")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const period = await getCurrentPeriod()
  const today  = todayPacific()

  let minutesRemaining:    number | null = null
  let currentPeriodEndISO: string | null = null
  let nextBlockEndISO:     string | null = null

  if (period.periodEnd) {
    currentPeriodEndISO = periodEndToUTC(today, period.periodEnd)
    minutesRemaining    = Math.round(
      (new Date(currentPeriodEndISO).getTime() - Date.now()) / 60_000
    )

    // Find the next block period after the current one
    const currentEndMins = timeToMinutes(period.periodEnd)
    const nextBlock = PERIODS.find(
      p => p.type === "block" && timeToMinutes(p.start) >= currentEndMins
    )
    if (nextBlock) {
      nextBlockEndISO = periodEndToUTC(today, nextBlock.end)
    }
  }

  return NextResponse.json({
    type:               period.type,
    blockNumber:        period.blockNumber,
    isSchoolDay:        period.isSchoolDay,
    periodStart:        period.periodStart,
    periodEnd:          period.periodEnd,
    minutesRemaining,
    currentPeriodEndISO,
    nextBlockEndISO,
  })
}
