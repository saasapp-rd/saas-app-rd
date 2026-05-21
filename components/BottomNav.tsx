"use client"
import { usePathname } from "next/navigation"
import { useSession }  from "next-auth/react"
import Link            from "next/link"

interface NavItem {
  href:          string
  label:         string
  icon:          string
  activeOn?:     "exact" | "sub"
  /**
   * Override the prefix used for "sub" matching. Use this when the
   * button links to a deeper page (e.g. /admin/config) but should
   * highlight for the whole section (e.g. /admin/users, /admin/courses).
   */
  activePrefix?: string
}

const NAV: Record<string, NavItem[]> = {
  super_admin: [
    { href: "/admin",        label: "Dashboard", icon: "🏠", activeOn: "exact" },
    { href: "/missing",      label: "Live",      icon: "👁"  },
    { href: "/analytics",    label: "Analytics", icon: "📊", activeOn: "sub", activePrefix: "/analytics" },
    { href: "/admin/config", label: "Admin",     icon: "⚙️", activeOn: "sub", activePrefix: "/admin" },
  ],
  admin: [
    { href: "/admin",        label: "Dashboard", icon: "🏠", activeOn: "exact" },
    { href: "/missing",      label: "Live",      icon: "👁"  },
    { href: "/analytics",    label: "Analytics", icon: "📊", activeOn: "sub", activePrefix: "/analytics" },
    { href: "/admin/config", label: "Admin",     icon: "⚙️", activeOn: "sub", activePrefix: "/admin" },
  ],
  dean: [
    { href: "/dean",         label: "Dashboard", icon: "🏠", activeOn: "exact" },
    { href: "/missing",      label: "Live",      icon: "👁"  },
    { href: "/analytics",    label: "Analytics", icon: "📊", activeOn: "sub", activePrefix: "/analytics" },
    { href: "/admin/config", label: "Admin",     icon: "⚙️", activeOn: "sub", activePrefix: "/admin" },
  ],
  coordinator: [
    { href: "/coordinator",  label: "Dashboard", icon: "🏠", activeOn: "sub", activePrefix: "/coordinator" },
    { href: "/missing",      label: "Live",      icon: "👁"  },
    { href: "/analytics",    label: "Analytics", icon: "📊", activeOn: "sub", activePrefix: "/analytics" },
    { href: "/admin/config", label: "Admin",     icon: "⚙️", activeOn: "sub", activePrefix: "/admin" },
  ],
  counselor: [
    { href: "/counselor",    label: "Dashboard", icon: "🏠", activeOn: "exact" },
    { href: "/missing",      label: "Live",      icon: "👁"  },
    { href: "/analytics",    label: "Analytics", icon: "📊", activeOn: "sub", activePrefix: "/analytics" },
  ],
  teacher: [
    { href: "/teacher",      label: "Classes",   icon: "📓", activeOn: "sub", activePrefix: "/teacher" },
    { href: "/missing",      label: "Live",      icon: "👁"  },
  ],
  staff: [
    { href: "/staff",        label: "Dashboard", icon: "🏠", activeOn: "sub", activePrefix: "/staff" },
    { href: "/missing",      label: "Live",      icon: "👁"  },
  ],
}

function isActive(item: NavItem, pathname: string): boolean {
  if (item.activeOn === "exact") return pathname === item.href
  // "sub" = anything *under* the prefix. With prefix=/admin this lights
  // up on /admin/config, /admin/users, etc. — but NOT on /admin itself,
  // so the Dashboard button keeps that page exclusively.
  const prefix = item.activePrefix ?? item.href
  if (item.activeOn === "sub")   return pathname.startsWith(prefix + "/")
  return pathname === item.href || pathname.startsWith(item.href + "/")
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
          const on = isActive(item, pathname)
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
