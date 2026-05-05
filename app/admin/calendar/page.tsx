import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import Link from "next/link"

const DAY_LABEL: Record<number, string> = { 1: "D1", 2: "D2", 3: "D3", 4: "D4" }
const DAY_COLOR: Record<number, string> = {
  1: "#E8F4FD", 2: "#FFF8E0", 3: "#F0FDF4", 4: "#FFF0F5",
}
const DAY_TEXT: Record<number, string> = {
  1: "#1A6FA6", 2: "#8B6200", 3: "#166534", 4: "#A6192E",
}

export default async function CalendarPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!["admin", "super_admin"].includes(session.user.role)) redirect("/dashboard")

  // Load current month
  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth() + 1
  const from  = `${year}-${String(month).padStart(2, "0")}-01`
  const toDate = new Date(year, month, 0)
  const to    = `${year}-${String(month).padStart(2, "0")}-${String(toDate.getDate()).padStart(2, "0")}`

  const { data: rows } = await db
    .from("school_calendar")
    .select("date, day_type, is_school_day, note")
    .gte("date", from)
    .lte("date", to)
    .order("date")

  const calMap = Object.fromEntries((rows ?? []).map(r => [r.date, r]))

  const todayStr = now.toISOString().split("T")[0]
  const monthName = now.toLocaleString("default", { month: "long" })

  // Build weeks for grid
  const firstDay = new Date(year, month - 1, 1).getDay() // 0=Sun
  const totalDays = toDate.getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between" style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">Admin &mdash; Calendar</div>
          <div className="text-white text-[10px] opacity-70">{monthName} {year}</div>
        </div>
        <SignOutButton />
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />
      <nav className="px-5 py-2 border-b flex items-center" style={{ borderColor: "#EAEAEA" }}>
        <Link href="/admin" className="text-xs font-bold" style={{ color: "#A6192E", textDecoration: "none" }}>
          &larr; Admin
        </Link>
      </nav>

      <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full">
        {/* Legend */}
        <div className="flex gap-2 flex-wrap mb-4">
          {[1,2,3,4].map(d => (
            <span key={d} className="text-[10px] font-bold px-2 py-0.5 rounded"
                  style={{ background: DAY_COLOR[d], color: DAY_TEXT[d] }}>
              Day {d} — Blocks {d === 1 ? "1,3,5,7" : d === 2 ? "2,4,6,8" : d === 3 ? "7,5,3,1" : "8,6,4,2"}
            </span>
          ))}
          <span className="text-[10px] font-bold px-2 py-0.5 rounded"
                style={{ background: "#F3F4F6", color: "#999" }}>
            No school
          </span>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
            <div key={d} className="text-center text-[9px] font-bold uppercase"
                 style={{ color: "#3D3D3D", opacity: 0.35 }}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />
            const dateStr = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`
            const row     = calMap[dateStr]
            const isToday = dateStr === todayStr
            const dt      = row?.day_type
            const isSchool = row?.is_school_day ?? false

            return (
              <div key={i} className="rounded-lg p-1.5 flex flex-col items-center gap-0.5 min-h-[52px]"
                   style={{
                     background: !row || !isSchool ? "#F9FAFB" : (dt ? DAY_COLOR[dt] : "#F9FAFB"),
                     border: isToday ? "2px solid #A6192E" : "1px solid #EAEAEA",
                   }}>
                <span className="text-xs font-bold" style={{ color: isToday ? "#A6192E" : "#3D3D3D" }}>
                  {day}
                </span>
                {dt && isSchool && (
                  <span className="text-[9px] font-bold" style={{ color: DAY_TEXT[dt] }}>
                    {DAY_LABEL[dt]}
                  </span>
                )}
                {row && !isSchool && (
                  <span className="text-[8px]" style={{ color: "#999" }}>off</span>
                )}
              </div>
            )
          })}
        </div>

        {rows && rows.length === 0 && (
          <p className="text-xs text-center mt-8" style={{ color: "#999" }}>
            No calendar data for this month. Run seed.sql in Supabase.
          </p>
        )}
      </main>
    </div>
  )
}
