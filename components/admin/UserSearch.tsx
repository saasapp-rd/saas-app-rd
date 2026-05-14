"use client"
import { useState, useMemo } from "react"
import Link from "next/link"

export interface SearchUser {
  id:        string
  name:      string
  email:     string | null
  role:      string
  is_active: boolean | null
}

const ROLE_BADGE: Record<string, { bg: string; color: string }> = {
  super_admin: { bg: "#FFF0F0", color: "#A6192E" },
  admin:       { bg: "#FFF0F0", color: "#A6192E" },
  dean:        { bg: "#FFF8E0", color: "#8B6200" },
  coordinator: { bg: "#EEF6FF", color: "#1E5FA6" },
  counselor:   { bg: "#F0FDF4", color: "#166534" },
  teacher:     { bg: "#EAEAEA", color: "#3D3D3D" },
  advisor:     { bg: "#EAEAEA", color: "#3D3D3D" },
  staff:       { bg: "#EAEAEA", color: "#3D3D3D" },
  student:     { bg: "#EAEAEA", color: "#3D3D3D" },
  parent:      { bg: "#EAEAEA", color: "#3D3D3D" },
}

const MAX_RESULTS = 15

export default function UserSearch({ users }: { users: SearchUser[] }) {
  const [query, setQuery] = useState("")
  const q = query.trim().toLowerCase()

  const results = useMemo(() => {
    if (!q) return []
    return users
      .filter(u =>
        u.name.toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q)
      )
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, MAX_RESULTS)
  }, [users, q])

  function hrefFor(u: SearchUser): string {
    return u.role === "student"
      ? `/students/${u.id}`
      : `/admin/users/${u.role}?edit=${u.id}`
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        type="search"
        placeholder={`Find any user — search ${users.length} accounts by name or email…`}
        value={query}
        onChange={e => setQuery(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl text-sm border outline-none"
        style={{ borderColor: "#EAEAEA", background: "#fff", color: "#3D3D3D" }}
      />
      {q && (
        <div className="rounded-xl border overflow-hidden"
             style={{ borderColor: "#EAEAEA", background: "#fff" }}>
          {results.length === 0 ? (
            <p className="text-xs text-center py-6" style={{ color: "#999" }}>
              No users matching &quot;{query}&quot;
            </p>
          ) : (
            <>
              <div className="px-3 py-2 text-[9px] font-bold tracking-[0.25em] uppercase"
                   style={{ color: "#999", background: "#FAFAFA" }}>
                {results.length} match{results.length !== 1 ? "es" : ""}
                {results.length === MAX_RESULTS ? ` (top ${MAX_RESULTS} shown)` : ""}
              </div>
              {results.map(u => {
                const badge = ROLE_BADGE[u.role] ?? ROLE_BADGE["staff"]
                return (
                  <Link key={u.id} href={hrefFor(u)} style={{ textDecoration: "none" }}>
                    <div className="px-4 py-2.5 flex items-center justify-between border-t"
                         style={{ cursor: "pointer", borderColor: "#F0F0F0" }}>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold"
                                style={{ color: u.is_active === false ? "#999" : "#3D3D3D" }}>
                            {u.name}
                          </span>
                          {u.is_active === false && (
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase"
                                  style={{ background: "#FEE2E2", color: "#CE2033" }}>
                              Inactive
                            </span>
                          )}
                        </div>
                        {u.email && (
                          <div className="text-[10px] truncate" style={{ color: "#999" }}>{u.email}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase"
                              style={{ background: badge.bg, color: badge.color }}>
                          {u.role.replace("_", " ")}
                        </span>
                        <span style={{ color: "#BABABA" }}>→</span>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </>
          )}
        </div>
      )}
    </div>
  )
}
