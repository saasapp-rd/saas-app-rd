import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import Link from "next/link"
import ReviewQueue, { DataIssue } from "@/components/admin/ReviewQueue"

export const dynamic = "force-dynamic"

export default async function ReviewQueuePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!["admin", "super_admin"].includes(session.user.role)) redirect("/dashboard")

  const { data } = await db
    .from("data_issues")
    .select("id, source, kind, ref_type, ref_id, title, details, status, created_at, resolved_at, notes")
    .order("created_at", { ascending: false })
    .range(0, 9999)

  const issues = (data ?? []) as DataIssue[]
  const openCount = issues.filter(i => i.status === "open").length

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between" style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">Review Queue</div>
          <div className="text-white text-[10px] opacity-70">
            {openCount} open · {issues.length} total
          </div>
        </div>
        <SignOutButton />
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />
      <nav className="px-5 py-2 border-b flex items-center" style={{ borderColor: "#EAEAEA" }}>
        <Link href="/admin/config" className="text-xs font-bold"
              style={{ color: "#A6192E", textDecoration: "none" }}>
          &larr; Admin
        </Link>
      </nav>

      <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full">
        <div className="rounded-xl px-4 py-3 mb-4 text-[10px]"
             style={{ background: "#FFFBEB", border: "1px solid #FDE68A", color: "#78350F" }}>
          Data-quality issues flagged by imports and other checks. Mark resolved
          once you&apos;ve fixed the underlying data, or dismiss if no action is
          needed (e.g. a legitimate schedule overlay).
        </div>
        <ReviewQueue issues={issues} />
      </main>
    </div>
  )
}
