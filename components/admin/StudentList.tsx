"use client"
import { useState, useMemo } from "react"
import StudentRowActions from "./StudentRowActions"

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

export interface EnrollmentRow {
  block:        number | null   // null = placeholder course, block not assigned yet
  courseName:   string
  room:         string | null
  teacherName:  string | null
  isAdvisory:   boolean
}

export interface ScheduleStatus {
  hasIssues:       boolean
  missingBlocks:   number[]  // any of 1-8 with no enrollment
  missingAdvisory: boolean   // no block 9 enrollment
  overlays:        number[]  // blocks with > 1 enrollment
}

export function analyzeSchedule(enrollments: EnrollmentRow[]): ScheduleStatus {
  // Null-block enrollments (placeholder courses) don't count toward
  // overlay / missing detection — we genuinely don't know what block
  // they belong in until admin assigns one.
  const counts = new Map<number, number>()
  for (const e of enrollments) {
    if (e.block != null) counts.set(e.block, (counts.get(e.block) ?? 0) + 1)
  }
  const missingBlocks   = [1,2,3,4,5,6,7,8].filter(b => !counts.has(b))
  const missingAdvisory = !counts.has(9)
  const overlays        = [...counts.entries()]
    .filter(([, c]) => c > 1)
    .map(([b]) => b)
    .sort((a, b) => a - b)
  return {
    hasIssues: missingBlocks.length > 0 || missingAdvisory || overlays.length > 0,
    missingBlocks,
    missingAdvisory,
    overlays,
  }
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

export default function StudentList({
  students,
  enrollmentsByStudent,
}: {
  students:             StudentRow[]
  enrollmentsByStudent?: Record<string, EnrollmentRow[]>
}) {
  const [search,             setSearch]             = useState("")
  const [sortField,          setSortField]          = useState<SortField>("last_name")
  const [sortDir,            setSortDir]            = useState<SortDir>("asc")
  const [gradeFilter,        setGradeFilter]        = useState<number[]>([])
  const [advisorFilter,      setAdvisorFilter]      = useState<string[]>([])
  const [page,               setPage]               = useState(0)
  const [showInactive,       setShowInactive]       = useState(false)
  const [scheduleIssuesOnly, setScheduleIssuesOnly] = useState(false)

  const query = search.trim().toLowerCase()

  const availableGrades = useMemo(() => {
    const grades = [...new Set(students.map(s => s.grade).filter((g): g is number => g != null))]
    return grades.sort((a, b) => a - b)
  }, [students])

  const availableAdvisors = useMemo(() => {
    const names = [...new Set(students.map(s => s.advisor_name).filter((n): n is string => !!n))]
    return names.sort()
  }, [students])

  const filtered = useMemo(() => {
    const base0 = showInactive ? students : students.filter(s => s.is_active !== false)
    let base = query
      ? base0.filter(s =>
          (s.last_name     ?? "").toLowerCase().includes(query) ||
          (s.first_name    ?? "").toLowerCase().includes(query) ||
          (s.call_by       ?? "").toLowerCase().includes(query) ||
          String(s.grade   ?? "").includes(query) ||
          (s.veracross_id  ?? "").toLowerCase().includes(query)
        )
      : base0

    if (gradeFilter.length > 0)
      base = base.filter(s => s.grade != null && gradeFilter.includes(s.grade))

    if (advisorFilter.length > 0)
      base = base.filter(s => s.advisor_name != null && advisorFilter.includes(s.advisor_name))

    if (scheduleIssuesOnly && enrollmentsByStudent) {
      base = base.filter(s => analyzeSchedule(enrollmentsByStudent[s.id] ?? []).hasIssues)
    }

    return sortStudents(base, sortField, sortDir)
  }, [students, query, sortField, sortDir, gradeFilter, advisorFilter, showInactive, scheduleIssuesOnly, enrollmentsByStudent])

  const scheduleIssuesCount = useMemo(() => {
    if (!enrollmentsByStudent) return 0
    return students.filter(s =>
      s.is_active !== false &&
      analyzeSchedule(enrollmentsByStudent[s.id] ?? []).hasIssues
    ).length
  }, [students, enrollmentsByStudent])

  const pageCount  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, pageCount - 1)
  const pageSlice  = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)
  const start      = safePage * PAGE_SIZE + 1
  const end        = Math.min((safePage + 1) * PAGE_SIZE, filtered.length)

  function handleSearch(v: string) { setSearch(v);  setPage(0) }

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

  const inactiveCount = useMemo(
    () => students.filter(s => s.is_active === false).length,
    [students]
  )
  const activeCount = students.length - inactiveCount
  const hasFilters  = gradeFilter.length > 0 || advisorFilter.length > 0

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
            const short  = name.split(" ").pop() ?? name
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

      {/* Schedule issues toggle (only when we have enrollment data) */}
      {scheduleIssuesCount > 0 && (
        <button type="button" onClick={() => setScheduleIssuesOnly(v => !v)}
          className="self-start text-[10px] font-bold px-2.5 py-1 rounded-full"
          style={{
            background: scheduleIssuesOnly ? "#CE2033" : "#FEE2E2",
            color:      scheduleIssuesOnly ? "#fff"    : "#CE2033",
            border: "none", cursor: "pointer",
          }}>
          {scheduleIssuesOnly ? "✕ Showing schedule issues" : `⚠ ${scheduleIssuesCount} schedule issue${scheduleIssuesCount === 1 ? "" : "s"}`}
        </button>
      )}

      {/* Count + inactive toggle */}
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-bold tracking-[0.25em] uppercase"
           style={{ color: "#3D3D3D", opacity: 0.35 }}>
          {query || hasFilters || scheduleIssuesOnly
            ? `${filtered.length} match${filtered.length !== 1 ? "es" : ""} · showing ${start}–${end}`
            : `${activeCount} active · ${students.length} total${pageCount > 1 ? ` · showing ${start}–${end}` : ""}`
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
            {showInactive ? `Hide inactive` : `+${inactiveCount} inactive`}
          </button>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <p className="text-xs text-center py-6" style={{ color: "#999" }}>
          {query ? `No students matching "${search}"` : "No students match the selected filters."}
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {pageSlice.map(s => (
            <StudentRowActions
              key={s.id}
              s={s}
              enrollments={enrollmentsByStudent?.[s.id] ?? []}
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
