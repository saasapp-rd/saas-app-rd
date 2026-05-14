"use client"
import { useState, useMemo } from "react"
import UserRowActions, { Course } from "./UserRowActions"

export interface UserRow {
  id:           string
  email:        string
  display_name: string | null
  phone:        string | null
  role:         string
  roles:        string[] | null
  is_active:    boolean | null
}

type SortField = "last_name" | "first_name" | "email"
type SortDir   = "asc" | "desc"

const SORT_PILLS: { field: SortField; label: string }[] = [
  { field: "last_name",  label: "Last Name"  },
  { field: "first_name", label: "First Name" },
  { field: "email",      label: "Email"      },
]

const PAGE_SIZE = 50

function lastWord(name: string): string {
  return name.trim().split(/\s+/).pop()?.toLowerCase() ?? ""
}

function sortUsers(users: UserRow[], field: SortField, dir: SortDir): UserRow[] {
  return [...users].sort((a, b) => {
    const an = a.display_name ?? a.email
    const bn = b.display_name ?? b.email
    let cmp = 0
    if (field === "email") {
      cmp = a.email.localeCompare(b.email)
    } else if (field === "first_name") {
      cmp = an.localeCompare(bn)
    } else {
      cmp = lastWord(an).localeCompare(lastWord(bn)) || an.localeCompare(bn)
    }
    return dir === "desc" ? -cmp : cmp
  })
}

interface Props {
  users:          UserRow[]
  currentUserId:  string
  label:          string
  role:           string
  coursesByUser?: Record<string, Course[]>
  allCourses?:    Course[]
}

export default function UserList({
  users, currentUserId, label, role, coursesByUser, allCourses,
}: Props) {
  const [search,       setSearch]       = useState("")
  const [sortField,    setSortField]    = useState<SortField>("last_name")
  const [sortDir,      setSortDir]      = useState<SortDir>("asc")
  const [page,         setPage]         = useState(0)
  const [showInactive, setShowInactive] = useState(false)

  const query = search.trim().toLowerCase()

  const inactiveCount = useMemo(
    () => users.filter(u => u.is_active === false).length,
    [users]
  )
  const activeCount = users.length - inactiveCount

  const filtered = useMemo(() => {
    const base0 = showInactive ? users : users.filter(u => u.is_active !== false)
    const base = query
      ? base0.filter(u =>
          (u.display_name ?? "").toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query) ||
          (u.phone ?? "").toLowerCase().includes(query)
        )
      : base0
    return sortUsers(base, sortField, sortDir)
  }, [users, query, sortField, sortDir, showInactive])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage  = Math.min(page, pageCount - 1)
  const pageSlice = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)
  const start     = safePage * PAGE_SIZE + 1
  const end       = Math.min((safePage + 1) * PAGE_SIZE, filtered.length)

  function handleSearch(v: string) { setSearch(v); setPage(0) }
  function handleSort(field: SortField) {
    if (field === sortField) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortField(field); setSortDir("asc") }
    setPage(0)
  }

  const labelLower = label.toLowerCase()

  return (
    <div className="flex flex-col gap-3">

      {/* Search */}
      <input
        type="search"
        placeholder={`Search ${labelLower} by name, email, or phone…`}
        value={search}
        onChange={e => handleSearch(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl text-sm border outline-none"
        style={{ borderColor: "#EAEAEA", background: "#fff", color: "#3D3D3D" }}
      />

      {/* Sort pills */}
      <div className="flex gap-1.5 flex-wrap">
        {SORT_PILLS.map(o => {
          const active = sortField === o.field
          const arrow  = active ? (sortDir === "asc" ? " ↑" : " ↓") : ""
          return (
            <button key={o.field} type="button" onClick={() => handleSort(o.field)}
              className="px-3 py-1 rounded-full text-[10px] font-bold"
              style={{
                background: active ? "#3D3D3D" : "#F4F4F4",
                color:      active ? "#fff"    : "#999",
                border: "none", cursor: "pointer",
              }}>
              {o.label}{arrow}
            </button>
          )
        })}
      </div>

      {/* Count + inactive toggle */}
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-bold tracking-[0.25em] uppercase"
           style={{ color: "#3D3D3D", opacity: 0.35 }}>
          {query
            ? `${filtered.length} match${filtered.length !== 1 ? "es" : ""} · showing ${start}–${end}`
            : `${activeCount} active · ${users.length} total${pageCount > 1 ? ` · showing ${start}–${end}` : ""}`
          }
        </p>
        {inactiveCount > 0 && (
          <button type="button" onClick={() => setShowInactive(v => !v)}
            className="text-[9px] font-bold px-2 py-0.5 rounded-full"
            style={{
              background: showInactive ? "#FEE2E2" : "#F4F4F4",
              color:      showInactive ? "#CE2033" : "#999",
              border: "none", cursor: "pointer",
            }}>
            {showInactive ? "Hide inactive" : `+${inactiveCount} inactive`}
          </button>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <p className="text-xs text-center py-6" style={{ color: "#999" }}>
          {query ? `No ${labelLower} matching "${search}"` : `No ${labelLower} match the filters.`}
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {pageSlice.map(u => (
            <UserRowActions
              key={u.id}
              id={u.id}
              displayName={u.display_name ?? u.email}
              email={u.email}
              phone={u.phone}
              role={u.role}
              roles={u.roles ?? undefined}
              isActive={u.is_active !== false}
              isSelf={u.id === currentUserId}
              myCourses={role === "teacher" ? (coursesByUser?.[u.id] ?? []) : undefined}
              allCourses={role === "teacher" ? allCourses : undefined}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="px-4 py-2 rounded-xl text-xs font-bold"
            style={{ background: "#F4F4F4", color: safePage === 0 ? "#BABABA" : "#3D3D3D",
                     border: "none", cursor: safePage === 0 ? "default" : "pointer" }}>
            ← Prev
          </button>
          <span className="text-[10px]" style={{ color: "#999" }}>
            {safePage + 1} / {pageCount}
          </span>
          <button
            onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
            disabled={safePage === pageCount - 1}
            className="px-4 py-2 rounded-xl text-xs font-bold"
            style={{ background: "#F4F4F4", color: safePage === pageCount - 1 ? "#BABABA" : "#3D3D3D",
                     border: "none", cursor: safePage === pageCount - 1 ? "default" : "pointer" }}>
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
