"use client"
import { usePathname } from "next/navigation"
import { useSession }  from "next-auth/react"
import Link            from "next/link"

interface NavItem {
  href:  string
  label: string
  icon:  string
}

const NAV: Record<string, NavItem[]> = {
  super_admin: [
    { href: "/missing",     label: "Live",      icon: "👁" },
    { href: "/coordinator", label: "Queue",     icon: "📋" },
    { href: "/dean",        label: "Patterns",  icon: "📊" },
    { href: "/admin",       label: "Admin",     icon: "⚙️"  },
  ],
  admin: [
    { href: "/missing",     label: "Live",      icon: "👁" },
    { href: "/coordinator", label: "Queue",     icon: "📋" },
    { href: "/dean",        label: "Patterns",  icon: "📊" },
    { href: "/admin",       label: "Admin",     icon: "⚙️"  },
  ],
  dean: [
    { href: "/missing",     label: "Live",      icon: "👁" },
    { href: "/coordinator", label: "Queue",     icon: "📋" },
    { href: "/dean",        label: "Patterns",  icon: "📊" },
    { href: "/admin/daily", label: "Today",     icon: "📅" },
  ],
  coordinator: [
    { href: "/missing",     label: "Live",      icon: "👁" },
    { href: "/coordinator", label: "Queue",     icon: "📋" },
    { href: "/dean",        label: "Patterns",  icon: "📊" },
    { href: "/admin/daily", label: "Today",     icon: "📅" },
  ],
  counselor: [
    { href: "/missing",     label: "Live",      icon: "👁" },
    { href: "/counselor",   label: "Flagged",   icon: "🚩" },
    { href: "/coordinator", label: "Queue",     icon: "📋" },
    { href: "/students",    label: "Students",  icon: "🔍" },
  ],
  teacher: [
    { href: "/missing",     label: "Live",      icon: "👁" },
    { href: "/teacher",     label: "Roster",    icon: "📓" },
  ],
  staff: [
    { href: "/missing",     label: "Live",      icon: "👁" },
    { href: "/staff",       label: "Staff",     icon: "🏢" },
    { href: "/staff/concern", label: "Report",  icon: "⚠️"  },
  ],
}

function active(href: string, pathname: string): boolean {
  // Exact match for top-level feed to avoid bleeding into sub-routes
  if (href === "/missing")  return pathname === "/missing"
  if (href === "/dean")     return pathname === "/dean"
  if (href === "/counselor") return pathname === "/counselor"
  if (href === "/teacher")  return pathname === "/teacher"
  if (href === "/staff")    return pathname === "/staff"
  // Admin root — active on /admin itself and /admin/users, but not /admin/daily
  if (href === "/admin")    return pathname === "/admin" || pathname.startsWith("/admin/users")
  // Everything else: prefix match
  return pathname === href || pathname.startsWith(href + "/")
}

const HIDE_ON = ["/login", "/login/error"]

export default function BottomNav() {
  const pathname  = usePathname()
  const { data }  = useSession()

  if (HIDE_ON.some(p => pathname.startsWith(p))) return null
  if (!data?.user) return null

  const items = NAV[data.user.role] ?? []
  if (items.length === 0) return null

  return (
    <>
      {/* In-flow spacer so page content is never obscured by the fixed bar */}
      <div style={{ height: "64px" }} aria-hidden="true" />

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t"
        style={{
          background:   "#fff",
          borderColor:  "#E5E5E5",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="flex max-w-lg mx-auto">
          {items.map(item => {
            const on = active(item.href, pathname)
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2"
                style={{ textDecoration: "none" }}
              >
                <span
                  className="text-xl leading-none"
                  style={{
                    filter:  on ? "none" : "grayscale(1)",
                    opacity: on ? 1 : 0.35,
                  }}
                >
                  {item.icon}
                </span>
                <span
                  className="text-[9px] font-black uppercase tracking-wide"
                  style={{ color: on ? "#A6192E" : "#BABABA" }}
                >
                  {item.label}
                </span>
                {on && (
                  <span
                    className="absolute bottom-0 rounded-full"
                    style={{
                      width: "4px", height: "4px",
                      background: "#A6192E",
                      marginBottom: "2px",
                    }}
                  />
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
