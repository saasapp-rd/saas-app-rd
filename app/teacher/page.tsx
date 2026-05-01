import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import Link from "next/link"

const ROSTER = [
  { id: 1, name: "Doe, Jane",    grade: 10 },
  { id: 2, name: "Kim, Alex",    grade: 10 },
  { id: 3, name: "Lee, Marcus",  grade: 10 },
  { id: 4, name: "Smith, John",  grade: 11 },
  { id: 5, name: "Torres, Maya", grade: 10 },
  { id: 6, name: "Walsh, Chris", grade: 11 },
]

export default async function TeacherPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!["teacher", "admin", "super_admin"].includes(session.user.role)) redirect("/dashboard")

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between" style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">Block 3 &mdash; 11:42am</div>
          <div className="text-white text-[10px] opacity-70">AP Biology &mdash; Room 204</div>
        </div>
        <SignOutButton />
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />
      <nav className="px-5 py-2 border-b flex items-center" style={{ borderColor: "#EAEAEA" }}>
        <Link href="/missing" className="text-xs font-bold" style={{ color: "#A6192E", textDecoration: "none" }}>
          &larr; All Missing Students
        </Link>
      </nav>

      <main className="flex-1 flex flex-col px-5 py-5 gap-4 max-w-lg mx-auto w-full">
        <div>
          <h1 className="text-base font-bold" style={{ color: "#3D3D3D" }}>Who is missing?</h1>
          <p className="text-xs mt-0.5" style={{ color: "#3D3D3D", opacity: 0.5 }}>
            Tap a student to mark them missing from your class
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {ROSTER.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border"
              style={{ background: "#F7F7F7", borderColor: "#EAEAEA" }}
            >
              <div className="w-5 h-5 rounded-full border-2 flex-shrink-0" style={{ borderColor: "#CCCCCC" }} />
              <div>
                <div className="text-sm font-semibold" style={{ color: "#3D3D3D" }}>{s.name}</div>
                <div className="text-[10px]" style={{ color: "#999" }}>Grade {s.grade}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="h-px" style={{ background: "#EAEAEA" }} />

        <button
          className="w-full py-4 rounded-xl text-white text-sm font-semibold tracking-wide"
          style={{ background: "#A6192E" }}
        >
          Report Missing (0)
        </button>
        <button
          className="w-full py-4 rounded-xl text-sm font-semibold"
          style={{ background: "#EAEAEA", color: "#3D3D3D" }}
        >
          Report Welfare Concern
        </button>
      </main>
    </div>
  )
}
