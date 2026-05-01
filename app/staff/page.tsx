import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import Link from "next/link"

export default async function StaffPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!["staff", "admin", "super_admin"].includes(session.user.role)) redirect("/dashboard")

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between" style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">SAAS RD App</div>
          <div className="text-white text-[10px] opacity-70">Lunch &mdash; 11:18am</div>
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
        <div
          className="rounded-xl p-4 flex flex-col gap-3"
          style={{ background: "#FFF0F0", border: "1.5px solid #CE2033" }}
        >
          <div className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: "#A6192E" }}>
            ⚠ Welfare Concern
          </div>
          <p className="text-sm font-semibold" style={{ color: "#3D3D3D" }}>
            See a student who seems unwell, unsafe, or unaccounted for?
          </p>
          <button className="py-3 rounded-xl text-white text-sm font-bold" style={{ background: "#CE2033" }}>
            Report a Concern
          </button>
        </div>

        <div className="h-px" style={{ background: "#EAEAEA" }} />

        <button
          className="w-full py-4 rounded-xl text-sm font-semibold"
          style={{ background: "#EAEAEA", color: "#3D3D3D" }}
        >
          Student is With Me / Found
        </button>
      </main>
    </div>
  )
}
