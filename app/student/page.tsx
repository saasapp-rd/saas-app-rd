import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"

export default async function StudentPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!["student", "admin", "super_admin"].includes(session.user.role)) redirect("/dashboard")

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between" style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">SAAS RD App</div>
        </div>
        <SignOutButton />
      </header>

      <TestModeBanner name={session.user.displayName} role={session.user.role} />

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-10 text-center gap-4">
        <div className="text-4xl">🎓</div>
        <h1 className="text-xl font-bold" style={{ color: "#3D3D3D" }}>Student View</h1>
        <p className="text-sm max-w-xs" style={{ color: "#3D3D3D", opacity: 0.6 }}>
          The student-facing portal is planned for a future phase. This placeholder confirms the student role routes correctly.
        </p>
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold"
          style={{ background: "#EAEAEA", color: "#3D3D3D" }}
        >
          Coming in a future phase
        </div>
      </main>
    </div>
  )
}
