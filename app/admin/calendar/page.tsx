import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import BackLink from "@/components/BackLink"
import TestModeBanner from "@/components/TestModeBanner"
import Link from "next/link"
import CalendarManager, { DayRow } from "@/components/admin/CalendarManager"

export const dynamic = "force-dynamic"

function parseMonth(raw: string | undefined): { year: number; month: number } {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const [y, m] = raw.split("-").map(Number)
    if (y >= 2020 && y <= 2099 && m >= 1 && m <= 12) return { year: y, month: m }
  }
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

function monthHref(year: number, month: number): string {
  return `/admin/calendar?m=${year}-${String(month).padStart(2,"0")}`
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!["admin", "super_admin"].includes(session.user.role)) redirect("/dashboard")

  const { m } = await searchParams
  const { year, month } = parseMonth(m)

  const from = `${year}-${String(month).padStart(2,"0")}-01`
  const last = new Date(year, month, 0).getDate()
  const to   = `${year}-${String(month).padStart(2,"0")}-${String(last).padStart(2,"0")}`

  const { data } = await db
    .from("school_calendar")
    .select("date, day_type, is_school_day, is_special, note, source")
    .gte("date", from)
    .lte("date", to)
    .order("date")

  const rows = (data ?? []) as DayRow[]

  const prevMonth = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 }
  const nextMonth = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between" style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">
            Manage School Calendar
          </div>
          <div className="text-white text-[10px] opacity-70">Day types &amp; special schedules</div>
        </div>
        <SignOutButton />
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />
      <nav className="px-5 py-2 border-b flex items-center" style={{ borderColor: "#EAEAEA" }}>
        <BackLink fallbackHref="/admin/config" />
      </nav>

      <main className="flex-1 px-5 py-5 max-w-3xl mx-auto w-full">
        <CalendarManager
          year={year}
          month={month}
          rows={rows}
          prevHref={monthHref(prevMonth.y, prevMonth.m)}
          nextHref={monthHref(nextMonth.y, nextMonth.m)}
        />
      </main>
    </div>
  )
}
