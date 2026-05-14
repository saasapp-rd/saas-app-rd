"use client"
import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"

export interface StudentRow {
  id:           string
  first_name:   string | null
  last_name:    string | null
  call_by:      string | null
  grade:        number | null
  veracross_id: string | null
  phone:        string | null
  is_active:    boolean | null
}

type SortKey = "last_name" | "first_name" | "grade_asc" | "grade_desc"

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "last_name",   label: "Last Name"  },
  { key: "first_name",  label: "First Name" },
  { key: "grade_asc",   label: "Grade ↑"    },
  { key: "grade_desc",  label: "Grade ↓"    },
]

const PAGE_SIZE = 50

function sortStudents(students: StudentRow[], key: SortKey): StudentRow[] {
  return [...students].sort((a, b) => {
    if (key === "grade_asc")  return (a.grade ?? 99) - (b.grade ?? 99)
    if (key === "grade_desc") return (b.grade ?? 0)  - (a.grade ?? 0)
    if (key === "first_name") return (a.first_name ?? "").localeCompare(b.first_name ?? "")
    return (a.last_name ?? "").localeCompare(b.last_name ?? "") ||
           (a.first_name ?? "").localeCompare(b.first_name ?? "")
  })
}

export default function StudentList({ students }: { students: StudentRow[] }) {
  const router = useRouter()
  const [search,        setSearch]        = useState("")
  const [sortKey,       setSortKey]       = useState<SortKey>("last_name")
  const [page,          setPage]          = useState(0)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting,      setDeleting]      = useState<string | null>(null)
  const [deleteError,   setDeleteError]   = useState("")

  const query = search.trim().toLowerCase()

  const filtered = useMemo(() => {
    const base = query
      ? students.filter(s =>
          (s.last_name  ?? "").toLowerCase().includes(query) ||
          (s.first_name ?? "").toLowerCase().includes(query) ||
          (s.call_by    ?? "").toLowerCase().includes(query) ||
          String(s.grade ?? "").includes(query) ||
          (s.veracross_id ?? "").toLowerCase().includes(query)
        )
      : students
    return sortStudents(base, sortKey)
  }, [students, query, sortKey])

  const pageCount  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, pageCount - 1)
  const pageSlice  = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)
  const start      = safePage * PAGE_SIZE + 1
  const end        = Math.min((safePage + 1) * PAGE_SIZE, filtered.length)

  function handleSearch(v: string) { setSearch(v); setPage(0) }
  function handleSort(k: SortKey)  { setSortKey(k); setPage(0) }

  async function deleteStudent(id: string) {
    setDeleting(id); setDeleteError("")
    const res = await fetch("/api/admin/users", {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id }),
    })
    if (res.ok) {
      setConfirmDelete(null)
      router.refresh()
    } else {
      const d = await res.json()
      setDeleteError(d.error ?? "Failed to delete.")
    }
    setDeleting(null)
  }

  const activeCount = students.filter(s => s.is_active !== false).length

  return (
    <div className="flex flex-col gap-3">

      {/* Search */}
      <input
        type="search"
        placeholder="Search by name, grade, or ID…"
        value={search}
        onChange={e => handleSearch(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl text-sm border outline-none"
        style={{ borderColor: "#EAEAEA", background: "#fff", color: "#3D3D3D" }}
      />

      {/* Sort pills */}
      <div className="flex gap-1.5 flex-wrap">
        {SORT_OPTIONS.map(o => (
          <button key={o.key} type="button" onClick={() => handleSort(o.key)}
            className="px-3 py-1 rounded-full text-[10px] font-bold"
            style={{
              background: sortKey === o.key ? "#3D3D3D" : "#F4F4F4",
              color:      sortKey === o.key ? "#fff"    : "#999",
              border: "none", cursor: "pointer",
            }}>
            {o.label}
          </button>
        ))}
      </div>

      {/* Count */}
      <p className="text-[9px] font-bold tracking-[0.25em] uppercase"
         style={{ color: "#3D3D3D", opacity: 0.35 }}>
        {query
          ? `${filtered.length} match${filtered.length !== 1 ? "es" : ""} · showing ${start}–${end}`
          : `${activeCount} active · ${students.length} total${pageCount > 1 ? ` · showing ${start}–${end}` : ""}`
        }
      </p>

      {/* List */}
      {filtered.length === 0 ? (
        <p className="text-xs text-center py-6" style={{ color: "#999" }}>
          {query ? `No students matching "${search}"` : "No students yet."}
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {pageSlice.map(s => {
            const isConfirming = confirmDelete === s.id
            const isDeleting   = deleting === s.id
            const displayName  = [s.last_name, s.first_name].filter(Boolean).join(", ") || "Unknown"
            const preferred    = s.call_by && s.call_by !== s.first_name ? ` (${s.call_by})` : ""

            return (
              <div key={s.id}
                   className="rounded-xl border overflow-hidden"
                   style={{ borderColor: isConfirming ? "#FECACA" : "#EAEAEA" }}>

                {/* Main row */}
                <div className="px-3 py-2.5 flex items-center justify-between"
                     style={{ background: isConfirming ? "#FFF5F5" : s.is_active !== false ? "#FAFAFA" : "#F9F9F9",
                              opacity: s.is_active !== false ? 1 : 0.5 }}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold" style={{ color: "#3D3D3D" }}>
                      {displayName}
                      {preferred && (
                        <span className="text-[10px] font-normal ml-1" style={{ color: "#999" }}>
                          {preferred}
                        </span>
                      )}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: "#999" }}>
                      {s.grade ? `Gr ${s.grade}` : "No grade"}
                      {s.veracross_id && (
                        <span> · <span style={{ fontFamily: "monospace" }}>ID {s.veracross_id}</span></span>
                      )}
                      {s.phone && ` · ${s.phone}`}
                    </p>
                  </div>

                  {!isConfirming && (
                    <button
                      onClick={() => { setConfirmDelete(s.id); setDeleteError("") }}
                      className="text-[9px] font-bold px-2 py-1 rounded-lg flex-shrink-0 ml-2"
                      style={{ background: "#FEE2E2", color: "#CE2033", border: "none", cursor: "pointer" }}>
                      Delete
                    </button>
                  )}
                </div>

                {/* Confirm delete row */}
                {isConfirming && (
                  <div className="px-3 py-2 border-t flex items-center justify-between gap-2"
                       style={{ borderColor: "#FECACA", background: "#fff" }}>
                    <p className="text-[10px] font-semibold" style={{ color: "#CE2033" }}>
                      Permanently delete {s.first_name} {s.last_name}?
                    </p>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => deleteStudent(s.id)}
                        disabled={isDeleting}
                        className="px-3 py-1 rounded-lg text-[10px] font-bold text-white"
                        style={{ background: "#CE2033", border: "none", cursor: "pointer",
                                 opacity: isDeleting ? 0.5 : 1 }}>
                        {isDeleting ? "…" : "Yes, delete"}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-3 py-1 rounded-lg text-[10px] font-bold"
                        style={{ background: "#EAEAEA", color: "#3D3D3D", border: "none", cursor: "pointer" }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {deleteError && (
        <p className="text-xs font-semibold text-center" style={{ color: "#CE2033" }}>{deleteError}</p>
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
