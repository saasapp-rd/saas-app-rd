"use client"
import { usePathname } from "next/navigation"
import { useSession }  from "next-auth/react"
import Link            from "next/link"

interface NavItem { href: string; label: string; icon: string }

const NAV: Record<string, NavItem[]> = {
  super_admin: [
    { href: "/admin",       label: "Dashboard",  icon: "🏠" },
    { href: "/missing",     label: "Live",        icon: "👁"  },
    { href: "/dean",        label: "Analytics",   icon: "📊" },
    { href: "/admin/users", label: "Admin",       icon: "⚙️"  },
  ],
  admin: [
    { href: "/admin",       label: "Dashboard",  icon: "🏠" },
    { href: "/missing",     label: "Live",        icon: "👁"  },
    { href: "/dean",        label: "Analytics",   icon: "📊" },
    { href: "/admin/users", label: "Admin",       icon: "⚙️"  },
  ],
  dean: [
    { href: "/missing",     label: "Live",        icon: "👁"  },
    { href: "/coordinator", label: "Queue",        icon: "📋" },
    { href: "/dean",        label: "Patterns",    icon: "📊" },
    { href: "/admin/daily", label: "Today",        icon: "📅" },
  ],
  coordinator: [
    { href: "/missing",     label: "Live",        icon: "👁"  },
    { href: "/coordinator", label: "Queue",        icon: "📋" },
    { href: "/dean",        label: "Patterns",    icon: "📊" },
    { href: "/admin/daily", label: "Today",        icon: "📅" },
  ],
  counselor: [
    { href: "/missing",     label: "Live",        icon: "👁"  },
    { href: "/counselor",   label: "Flagged",      icon: "🚩" },
    { href: "/coordinator", label: "Queue",        icon: "📋" },
    { href: "/students",    label: "Students",    icon: "🔍" },
  ],
  teacher: [
    { href: "/missing",     label: "Live",        icon: "👁"  },
    { href: "/teacher",     label: "Roster",       icon: "📓" },
  ],
  staff: [
    { href: "/missing",     label: "Live",        icon: "👁"  },
    { href: "/staff",       label: "Staff",        icon: "🏢" },
    { href: "/staff/concern", label: "Report",    icon: "⚠️"  },
  ],
}

function isActive(href: string, pathname: string): boolean {
  // Admin users tab — active on /admin/users/* only
  if (href === "/admin/users") return pathname.startsWith("/admin/users")
  // Dashboard tab — active on /admin but NOT /admin/users/*
  if (href === "/admin")       return pathname === "/admin" || (pathname.startsWith("/admin/") && !pathname.startsWith("/admin/users"))
  if (href === "/missing")     return pathname === "/missing"
  if (href === "/dean")        return pathname === "/dean"
  if (href === "/counselor")   return pathname === "/counselor"
  if (href === "/teacher")     return pathname === "/teacher"
  if (href === "/staff")       return pathname === "/staff"
  return pathname === href || pathname.startsWith(href + "/")
}

const HIDE_ON = ["/login"]

export default function BottomNav() {
  const pathname = usePathname()
  const { data } = useSession()

  if (HIDE_ON.some(p => pathname.startsWith(p))) return null
  if (!data?.user) return null

  const items = NAV[data.user.role] ?? []
  if (!items.length) return null

  return (
    <nav style={{ flexShrink: 0, borderTop: "1px solid #E5E5E5", background: "#fff",
                  paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
      <div className="flex max-w-lg mx-auto">
        {items.map(item => {
          const on = isActive(item.href, pathname)
          return (
            <Link key={item.href} href={item.href}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5"
                  style={{ textDecoration: "none", position: "relative" }}>
              <span className="text-xl leading-none"
                    style={{ filter: on ? "none" : "grayscale(1)", opacity: on ? 1 : 0.3 }}>
                {item.icon}
              </span>
              <span className="text-[9px] font-black uppercase tracking-wide"
                    style={{ color: on ? "#A6192E" : "#BABABA" }}>
                {item.label}
              </span>
              {on && (
                <span style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)",
                               width: 4, height: 4, borderRadius: "50%", background: "#A6192E" }} />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
