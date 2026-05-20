"use client"
import { useState, useMemo } from "react"
import StudentRowActions from "./StudentRowActions"
// Pure schedule analysis lives in lib/ so server components can call it
// too. Re-export from here for backwards compat with existing imports.
import { analyzeSchedule } from "@/lib/scheduleAnalysis"
import type { EnrollmentRow, ScheduleStatus } from "@/lib/scheduleAnalysis"
export { analyzeSchedule }
export type { EnrollmentRow, ScheduleStatus }

export interface StudentRow {
  id:                     string
  first_name:             string | null
  last_name:              string | null
  call_by:                string | null
  grade:                  number | null
  veracross_id:           string | null
  phone:                  string | null
  is_active:              boolean | null
  advisor_name:           string | null
  schedule_acknowledged?: boolean | null
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

export interface IncidentSummary {
  total:    number
  last30d:  number
  elevated: number
  lastDate: string | null
}

export default function StudentList({
  students,
  enrollmentsByStudent,
  incidentsByStudent,
}: {
  students:              StudentRow[]
  enrollmentsByStudent?: Record<string, EnrollmentRow[]>
  incidentsByStudent?:   Record<string, IncidentSummary>
}) {
  const [search,             setSearch]             = useState("")
  const [sortField,          setSortField]          = useState<SortField>("last_name")
  const [sortDir,            setSortDir]            = useState<SortDir>("asc")
  const [gradeFilter,        setGradeFilter]        = useState<number[]>([])
  const [advisorFilter,      setAdvisorFilter]      = useState<string[]>([])
  const [page,               setPage]               = useState(0)
  const [inactiveOnly,       setInactiveOnly]       = useState(false)
  const [scheduleIssuesOnly, setScheduleIssuesOnly] = useState(false)
  const [variantOkOnly,      setVariantOkOnly]      = useState(false)

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
    // inactiveOnly shows ONLY inactive students (similar UX to schedule-
    // issues / variant-OK filters). Default view excludes inactive.
    const base0 = inactiveOnly
      ? students.filter(s => s.is_active === false)
      : students.filter(s => s.is_active !== false)
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

    // Schedule-issues filter excludes acknowledged ("variant OK") students
    // — those have a separate toggle below the inactive count.
    if (scheduleIssuesOnly && enrollmentsByStudent) {
      base = base.filter(s =>
        !s.schedule_acknowledged &&
        analyzeSchedule(enrollmentsByStudent[s.id] ?? []).hasIssues
      )
    }

    // Variant-OK filter: students whose schedule HAS issues but admin has
    // marked them as known-OK. Mutually exclusive with scheduleIssuesOnly.
    if (variantOkOnly && enrollmentsByStudent) {
      base = base.filter(s =>
        !!s.schedule_acknowledged &&
        analyzeSchedule(enrollmentsByStudent[s.id] ?? []).hasIssues
      )
    }

    return sortStudents(base, sortField, sortDir)
  }, [students, query, sortField, sortDir, gradeFilter, advisorFilter, inactiveOnly, scheduleIssuesOnly, variantOkOnly, enrollmentsByStudent])

  // Count only unacknowledged issues — acknowledged variants are
  // intentionally weird and shouldn't pad the warning total.
  const scheduleIssuesCount = useMemo(() => {
    if (!enrollmentsByStudent) return 0
    return students.filter(s =>
      s.is_active !== false &&
      !s.schedule_acknowledged &&
      analyzeSchedule(enrollmentsByStudent[s.id] ?? []).hasIssues
    ).length
  }, [students, enrollmentsByStudent])

  // Variant-OK = student has schedule issues AND admin has acknowledged.
  const variantOkCount = useMemo(() => {
    if (!enrollmentsByStudent) return 0
    return students.filter(s =>
      s.is_active !== false &&
      !!s.schedule_acknowledged &&
      analyzeSchedule(enrollmentsByStudent[s.id] ?? []).hasIssues
    ).length
  }, [students, enrollmentsByStudent])

  // Toggle helpers — schedule-issues / variant-OK / inactive are
  // mutually exclusive filters. Turning one on flips the others off
  // so the list state stays coherent.
  function toggleScheduleIssues() {
    setScheduleIssuesOnly(v => {
      const next = !v
      if (next) { setVariantOkOnly(false); setInactiveOnly(false) }
      return next
    })
    setPage(0)
  }
  function toggleVariantOk() {
    setVariantOkOnly(v => {
      const next = !v
      if (next) { setScheduleIssuesOnly(false); setInactiveOnly(false) }
      return next
    })
    setPage(0)
  }
  function toggleInactive() {
    setInactiveOnly(v => {
      const next = !v
      if (next) { setScheduleIssuesOnly(false); setVariantOkOnly(false) }
      return next
    })
    setPage(0)
  }

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

      {/* Schedule issues / variant-OK status:
          - Idle: small red pill "⚠ N schedule issues"
          - Active (either filter): full-width banner — wider visual
            since the filter is the dominant frame of the list. */}
      {scheduleIssuesOnly && (
        <button type="button" onClick={toggleScheduleIssues}
          className="w-full text-[10px] font-bold py-2 rounded-xl"
          style={{
            background: "#CE2033", color: "#fff",
            border: "none", cursor: "pointer",
          }}>
          ✕ Showing schedule issues
        </button>
      )}
      {variantOkOnly && (
        <button type="button" onClick={toggleVariantOk}
          className="w-full text-[10px] font-bold py-2 rounded-xl"
          style={{
            background: "#A06000", color: "#fff",
            border: "none", cursor: "pointer",
          }}>
          ✕ Showing Variant OK students
        </button>
      )}
      {inactiveOnly && (
        <button type="button" onClick={toggleInactive}
          className="w-full text-[10px] font-bold py-2 rounded-xl"
          style={{
            background: "#3D3D3D", color: "#fff",
            border: "none", cursor: "pointer",
          }}>
          ✕ Showing Inactive students
        </button>
      )}
      {!scheduleIssuesOnly && !variantOkOnly && !inactiveOnly && scheduleIssuesCount > 0 && (
        <button type="button" onClick={toggleScheduleIssues}
          className="self-start text-[10px] font-bold px-2.5 py-1 rounded-full"
          style={{
            background: "#FEE2E2", color: "#CE2033",
            border: "none", cursor: "pointer",
          }}>
          ⚠ {scheduleIssuesCount} schedule issue{scheduleIssuesCount === 1 ? "" : "s"}
        </button>
      )}

      {/* Count + inactive / variant-ok toggles */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[9px] font-bold tracking-[0.25em] uppercase"
           style={{ color: "#3D3D3D", opacity: 0.35 }}>
          {query || hasFilters || scheduleIssuesOnly || variantOkOnly || inactiveOnly
            ? `${filtered.length} match${filtered.length !== 1 ? "es" : ""} · showing ${start}–${end}`
            : `${activeCount} active · ${students.length} total${pageCount > 1 ? ` · showing ${start}–${end}` : ""}`
          }
        </p>
        <div className="flex items-center gap-1.5">
          {/* Each pill hides while its own banner is active up top —
              the banner is the dismiss affordance. */}
          {variantOkCount > 0 && !variantOkOnly && (
            <button type="button" onClick={toggleVariantOk}
              className="text-[9px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: "#F4F4F4", color: "#999",
                border: "none", cursor: "pointer",
              }}>
              +{variantOkCount} variant ok
            </button>
          )}
          {inactiveCount > 0 && !inactiveOnly && (
            <button type="button" onClick={toggleInactive}
              className="text-[9px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: "#F4F4F4", color: "#999",
                border: "none", cursor: "pointer",
              }}>
              +{inactiveCount} inactive
            </button>
          )}
        </div>
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
              incidents={incidentsByStudent?.[s.id]}
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
