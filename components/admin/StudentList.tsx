"use client"
import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

export interface StudentRow {
  id:            string
  first_name:    string | null
  last_name:     string | null
  call_by:       string | null
  grade:         number | null
  veracross_id:  string | null
  phone:         string | null
  is_active:     boolean | null
  advisor_name:  string | null
}

type SortField = "last_name" | "first_name" | "grade"
type SortDir   = "asc" | "desc"

const SORT_PILLS: { field: SortField; label: string }[] = [
  { field: "last_name",  label: "Last Name"  },
  { field: "first_name", label: "First Name" },
  { field: "grade",      label: "Grade"      },
]

const PAGE_SIZE = 50

function sortStudents(students: StudentRow[], field: SortField, dir: SortDir): StudentRow[] {
  return [...students].sort((a, b) => {
    let cmp = 0
    if (field === "grade") {
      cmp = (a.grade ?? 99) - (b.grade ?? 99)
    } else if (field === "first_name") {
      cmp = (a.first_name ?? "").localeCompare(b.first_name ?? "")
    } else {
      cmp = (a.last_name ?? "").localeCompare(b.last_name ?? "") ||
            (a.first_name ?? "").localeCompare(b.first_name ?? "")
    }
    return dir === "desc" ? -cmp : cmp
  })
}

export default function StudentList({ students }: { students: StudentRow[] }) {
  const router = useRouter()
  const [search,        setSearch]        = useState("")
  const [sortField,     setSortField]     = useState<SortField>("last_name")
  const [sortDir,       setSortDir]       = useState<SortDir>("asc")
  const [gradeFilter,   setGradeFilter]   = useState<number[]>([])
  const [advisorFilter, setAdvisorFilter] = useState<string[]>([])
  const [page,          setPage]          = useState(0)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting,      setDeleting]      = useState<string | null>(null)
  const [deleteError,   setDeleteError]   = useState("")

  const query = search.trim().toLowerCase()

  // Derive available grades and advisors from the full list
  const availableGrades = useMemo(() => {
    const grades = [...new Set(students.map(s => s.grade).filter((g): g is number => g != null))]
    return grades.sort((a, b) => a - b)
  }, [students])

  const availableAdvisors = useMemo(() => {
    const names = [...new Set(students.map(s => s.advisor_name).filter((n): n is string => !!n))]
    return names.sort()
  }, [students])

  const filtered = useMemo(() => {
    let base = query
      ? students.filter(s =>
          (s.last_name     ?? "").toLowerCase().includes(query) ||
          (s.first_name    ?? "").toLowerCase().includes(query) ||
          (s.call_by       ?? "").toLowerCase().includes(query) ||
          String(s.grade   ?? "").includes(query) ||
          (s.veracross_id  ?? "").toLowerCase().includes(query)
        )
      : students

    if (gradeFilter.length > 0)
      base = base.filter(s => s.grade != null && gradeFilter.includes(s.grade))

    if (advisorFilter.length > 0)
      base = base.filter(s => s.advisor_name != null && advisorFilter.includes(s.advisor_name))

    return sortStudents(base, sortField, sortDir)
  }, [students, query, sortField, sortDir, gradeFilter, advisorFilter])

  const pageCount  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, pageCount - 1)
  const pageSlice  = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)
  const start      = safePage * PAGE_SIZE + 1
  const end        = Math.min((safePage + 1) * PAGE_SIZE, filtered.length)

  function handleSearch(v: string)  { setSearch(v);  setPage(0) }

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDir(d => d === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDir("asc")
    }
    setPage(0)
  }

  function toggleGrade(g: number) {
    setGradeFilter(prev =>
      prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
    )
    setPage(0)
  }

  function toggleAdvisor(name: string) {
    setAdvisorFilter(prev =>
      prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]
    )
    setPage(0)
  }

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

  const activeCount   = students.filter(s => s.is_active !== false).length
  const hasFilters    = gradeFilter.length > 0 || advisorFilter.length > 0

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

      {/* Grade filter chips */}
      {availableGrades.length > 0 && (
        <div className="flex gap-1.5 flex-wrap items-center">
          <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: "#999" }}>Grade</span>
          {availableGrades.map(g => {
            const active = gradeFilter.includes(g)
            return (
              <button key={g} type="button" onClick={() => toggleGrade(g)}
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{
                  background: active ? "#A6192E" : "#F4F4F4",
                  color:      active ? "#fff"    : "#999",
                  border: "none", cursor: "pointer",
                }}>
                {g}
              </button>
            )
          })}
          {gradeFilter.length > 0 && (
            <button type="button" onClick={() => setGradeFilter([])}
              className="text-[9px]"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#BABABA" }}>
              clear
            </button>
          )}
        </div>
      )}

      {/* Advisor filter chips */}
      {availableAdvisors.length > 0 && (
        <div className="flex gap-1.5 flex-wrap items-center">
          <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: "#999" }}>Advisor</span>
          {availableAdvisors.map(name => {
            const active = advisorFilter.includes(name)
            const short  = name.split(" ").pop() ?? name  // last name only in chip
            return (
              <button key={name} type="button" onClick={() => toggleAdvisor(name)}
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{
                  background: active ? "#1E5FA6" : "#F4F4F4",
                  color:      active ? "#fff"    : "#999",
                  border: "none", cursor: "pointer",
                }}>
                {short}
              </button>
            )
          })}
          {advisorFilter.length > 0 && (
            <button type="button" onClick={() => setAdvisorFilter([])}
              className="text-[9px]"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#BABABA" }}>
              clear
            </button>
          )}
        </div>
      )}

      {/* Count */}
      <p className="text-[9px] font-bold tracking-[0.25em] uppercase"
         style={{ color: "#3D3D3D", opacity: 0.35 }}>
        {query || hasFilters
          ? `${filtered.length} match${filtered.length !== 1 ? "es" : ""} · showing ${start}–${end}`
          : `${activeCount} active · ${students.length} total${pageCount > 1 ? ` · showing ${start}–${end}` : ""}`
        }
      </p>

      {/* List */}
      {filtered.length === 0 ? (
        <p className="text-xs text-center py-6" style={{ color: "#999" }}>
          {query ? `No students matching "${search}"` : "No students match the selected filters."}
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
                <div className="flex items-center justify-between"
                     style={{ background: isConfirming ? "#FFF5F5" : s.is_active !== false ? "#FAFAFA" : "#F9F9F9",
                              opacity: s.is_active !== false ? 1 : 0.5 }}>
                  <Link href={`/students/${s.id}`} style={{ textDecoration: "none", flex: 1, minWidth: 0 }}
                        className="px-3 py-2.5 block">
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
                      {s.advisor_name && ` · ${s.advisor_name}`}
                    </p>
                  </Link>

                  {!isConfirming && (
                    <button
                      onClick={() => { setConfirmDelete(s.id); setDeleteError("") }}
                      className="text-[9px] font-bold px-2 py-1 rounded-lg flex-shrink-0 mx-2"
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
