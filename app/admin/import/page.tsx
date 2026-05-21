import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import SignOutButton from "@/components/SignOutButton"
import BackLink from "@/components/BackLink"
import TestModeBanner from "@/components/TestModeBanner"
import Link from "next/link"
import CsvImportSection from "@/components/admin/CsvImportSection"

export default async function ImportPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (session.user.role !== "super_admin") redirect("/dashboard")

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between"
              style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">
            CSV Import
          </div>
          <div className="text-white text-[10px] opacity-70">
            Upload rosters &amp; schedules
          </div>
        </div>
        <SignOutButton />
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />
      <nav className="px-5 py-2 border-b flex items-center gap-4" style={{ borderColor: "#EAEAEA" }}>
        <BackLink fallbackHref="/admin/config" />
      </nav>

      <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full">
        <CsvImportSection />
      </main>
    </div>
  )
}
