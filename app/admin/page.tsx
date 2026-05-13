import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import Link from "next/link"

const LINKS = [
  {
    href:  "/admin/users",
    label: "Manage Users",
    desc:  "Add, edit, or deactivate accounts by role",
    icon:  "👥",
  },
  {
    href:  "/admin/import",
    label: "CSV Import",
    desc:  "Upload student roster, teacher list, and class schedule",
    icon:  "📥",
  },
  {
    href:  "/admin/daily",
    label: "Daily Summary",
    desc:  "Today\'s attendance overview",
    icon:  "📅",
  },
]

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!["admin", "super_admin"].includes(session.user.role)) redirect("/dashboard")

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between"
              style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">Admin</div>
          <div className="text-white text-[10px] opacity-70">
            {session.user.displayName ?? session.user.email}
          </div>
        </div>
        <SignOutButton />
      </header>
      <TestModeBanner name={session.user.displayName} role={session.user.role} />

      <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full flex flex-col gap-3">
        {LINKS.map(({ href, label, desc, icon }) => (
          <Link key={href} href={href} style={{ textDecoration: "none" }}>
            <div className="rounded-xl px-4 py-4 border flex items-center gap-4"
                 style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
              <span className="text-2xl">{icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold" style={{ color: "#3D3D3D" }}>{label}</div>
                <div className="text-[10px] mt-0.5" style={{ color: "#999" }}>{desc}</div>
              </div>
              <span style={{ color: "#BABABA" }}>&rarr;</span>
            </div>
          </Link>
        ))}
      </main>
    </div>
  )
}
