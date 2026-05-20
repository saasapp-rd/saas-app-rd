"use client"
import { useState, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import CourseRowActions from "./CourseRowActions"
import type { CourseRow, TeacherOption } from "./CourseRowActions"

type SortField = "block" | "name" | "teacher" | "enrollment"
type SortDir   = "asc" | "desc"

const SORT_PILLS: { field: SortField; label: string }[] = [
  { field: "block",      label: "Block"      },
  { field: "name",       label: "Name"       },
  { field: "teacher",    label: "Teacher"    },
  { field: "enrollment", label: "Enrollment" },
]

const PAGE_SIZE  = 50
const BLOCK_BITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]
const BLOCK_LABEL: Record<number, string> = {
  1: "1", 2: "2", 3: "3", 4: "4",
  5: "5", 6: "6", 7: "7", 8: "8",
  9: "Adv",
}

function teacherName(c: CourseRow): string {
  return c.teacher?.display_name ?? ""
}

function sortCourses(courses: CourseRow[], field: SortField, dir: SortDir): CourseRow[] {
  return [...courses].sort((a, b) => {
    let cmp = 0
    if (field === "block") {
      // Nulls (Needs Review) first when ascending so they surface for fixup.
      const ab = a.block_number ?? -1
      const bb = b.block_number ?? -1
      cmp = ab - bb || a.name.localeCompare(b.name)
    } else if (field === "name") {
      cmp = a.name.localeCompare(b.name)
    } else if (field === "teacher") {
      cmp = teacherName(a).localeCompare(teacherName(b)) || a.name.localeCompare(b.name)
    } else {
      cmp = a.enrollment_count - b.enrollment_count || a.name.localeCompare(b.name)
    }
    return dir === "desc" ? -cmp : cmp
  })
}

export default function CoursesList({
  courses,
  teachers,
}: {
  courses:  CourseRow[]
  teachers: TeacherOption[]
}) {
  // Initial state can be deep-linked from the Review Queue ("Fix" button
  // sends ?search=<class_id> for a single-course focus, or
  // ?needs_review=1 for the placeholder-courses bucket).
  const searchParams = useSearchParams()
  const initialSearch       = searchParams?.get("search") ?? ""
  const initialNeedsReview  = searchParams?.get("needs_review") === "1"

  const [search,           setSearch]           = useState(initialSearch)
  const [sortField,        setSortField]        = useState<SortField>("block")
  const [sortDir,          setSortDir]          = useState<SortDir>("asc")
  const [blockFilter,      setBlockFilter]      = useState<number[]>([])
  const [levelFilter,      setLevelFilter]      = useState<string[]>([])
  const [gradeFilter,      setGradeFilter]      = useState<string[]>([])
  const [page,             setPage]             = useState(0)
  const [showInactive,     setShowInactive]     = useState(false)
  const [needsReviewOnly,  setNeedsReviewOnly]  = useState(initialNeedsReview)

  const query = search.trim().toLowerCase()

  const availableBlocks = useMemo(() => {
    const set = new Set<number | null>()
    for (const c of courses) set.add(c.block_number)
    return BLOCK_BITS.filter(b => set.has(b))
  }, [courses])

  const availableLevels = useMemo(() => {
    const set = new Set<string>()
    for (const c of courses) if (c.school_level) set.add(c.school_level)
    return [...set].sort()
  }, [courses])

  const availableGrades = useMemo(() => {
    const set = new Set<string>()
    for (const c of courses) if (c.grade_level) set.add(c.grade_level)
    return [...set].sort()
  }, [courses])

  const inactiveCount    = useMemo(() => courses.filter(c => c.is_active === false).length, [courses])
  const needsReviewCount = useMemo(() => courses.filter(c => c.block_number === null && c.is_active !== false).length, [courses])
  const activeCount      = courses.length - inactiveCount

  const filtered = useMemo(() => {
    let base = showInactive ? courses : courses.filter(c => c.is_active !== false)

    if (needsReviewOnly) base = base.filter(c => c.block_number === null)

    if (query) {
      base = base.filter(c =>
        c.name.toLowerCase().includes(query) ||
        (c.class_id      ?? "").toLowerCase().includes(query) ||
        (c.course_code   ?? "").toLowerCase().includes(query) ||
        (c.room          ?? "").toLowerCase().includes(query) ||
        teacherName(c).toLowerCase().includes(query)
      )
    }
    if (blockFilter.length > 0)
      base = base.filter(c => c.block_number != null && blockFilter.includes(c.block_number))
    if (levelFilter.length > 0)
      base = base.filter(c => c.school_level != null && levelFilter.includes(c.school_level))
    if (gradeFilter.length > 0)
      base = base.filter(c => c.grade_level != null && gradeFilter.includes(c.grade_level))

    return sortCourses(base, sortField, sortDir)
  }, [courses, query, sortField, sortDir, blockFilter, levelFilter, gradeFilter, showInactive, needsReviewOnly])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage  = Math.min(page, pageCount - 1)
  const pageSlice = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)
  const start     = safePage * PAGE_SIZE + 1
  const end       = Math.min((safePage + 1) * PAGE_SIZE, filtered.length)

  function handleSearch(v: string) { setSearch(v); setPage(0) }
  function handleSort(f: SortField) {
    if (f === sortField) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortField(f); setSortDir("asc") }
    setPage(0)
  }
  function toggleBlock(b: number) {
    setBlockFilter(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b])
    setPage(0)
  }
  function toggleLevel(l: string) {
    setLevelFilter(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l])
    setPage(0)
  }
  function toggleGrade(g: string) {
    setGradeFilter(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])
    setPage(0)
  }

  const hasFilters = blockFilter.length + levelFilter.length + gradeFilter.length > 0

  if (courses.length === 0) {
    return <p className="text-xs text-center py-8" style={{ color: "#999" }}>No courses yet.</p>
  }

  return (
    <div className="flex flex-col gap-3">

      {/* Search */}
      <input
        type="search"
        placeholder="Search by course name, Class ID, teacher, or room…"
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

      {/* Block filter chips */}
      {availableBlocks.length > 0 && (
        <div className="flex gap-1.5 flex-wrap items-center">
          <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: "#999" }}>Block</span>
          {availableBlocks.map(b => {
            const active = blockFilter.includes(b)
            return (
              <button key={b} type="button" onClick={() => toggleBlock(b)}
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{
                  background: active ? (b === 9 ? "#1E5FA6" : "#A6192E") : "#F4F4F4",
                  color:      active ? "#fff"    : "#999",
                  border: "none", cursor: "pointer",
                }}>
                {BLOCK_LABEL[b]}
              </button>
            )
          })}
          {blockFilter.length > 0 && (
            <button onClick={() => setBlockFilter([])}
              className="text-[9px]"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#BABABA" }}>
              clear
            </button>
          )}
        </div>
      )}

      {/* School level chips */}
      {availableLevels.length > 1 && (
        <div className="flex gap-1.5 flex-wrap items-center">
          <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: "#999" }}>Level</span>
          {availableLevels.map(l => {
            const active = levelFilter.includes(l)
            const short  = l.replace("Upper School", "US").replace("Middle School", "MS")
            return (
              <button key={l} type="button" onClick={() => toggleLevel(l)}
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{
                  background: active ? "#3D3D3D" : "#F4F4F4",
                  color:      active ? "#fff"    : "#999",
                  border: "none", cursor: "pointer",
                }}>
                {short}
              </button>
            )
          })}
          {levelFilter.length > 0 && (
            <button onClick={() => setLevelFilter([])}
              className="text-[9px]"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#BABABA" }}>
              clear
            </button>
          )}
        </div>
      )}

      {/* Grade level chips */}
      {availableGrades.length > 1 && (
        <div className="flex gap-1.5 flex-wrap items-center">
          <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: "#999" }}>Grade</span>
          {availableGrades.map(g => {
            const active = gradeFilter.includes(g)
            const short  = g.replace(/^Grade\s*/i, "")
            return (
              <button key={g} type="button" onClick={() => toggleGrade(g)}
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{
                  background: active ? "#A6192E" : "#F4F4F4",
                  color:      active ? "#fff"    : "#999",
                  border: "none", cursor: "pointer",
                }}>
                {short}
              </button>
            )
          })}
          {gradeFilter.length > 0 && (
            <button onClick={() => setGradeFilter([])}
              className="text-[9px]"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#BABABA" }}>
              clear
            </button>
          )}
        </div>
      )}

      {/* Status toggles */}
      <div className="flex flex-wrap gap-1.5">
        {needsReviewCount > 0 && (
          <button onClick={() => setNeedsReviewOnly(v => !v)}
            className="text-[10px] font-bold px-2.5 py-1 rounded-full"
            style={{
              background: needsReviewOnly ? "#CE2033" : "#FEE2E2",
              color:      needsReviewOnly ? "#fff"    : "#CE2033",
              border: "none", cursor: "pointer",
            }}>
            {needsReviewOnly ? "✕ Showing needs-review" : `⚠ ${needsReviewCount} need${needsReviewCount === 1 ? "s" : ""} review`}
          </button>
        )}
        {inactiveCount > 0 && (
          <button onClick={() => setShowInactive(v => !v)}
            className="text-[10px] font-bold px-2.5 py-1 rounded-full"
            style={{
              background: showInactive ? "#FEE2E2" : "#F4F4F4",
              color:      showInactive ? "#CE2033" : "#999",
              border: "none", cursor: "pointer",
            }}>
            {showInactive ? "Hide inactive" : `+${inactiveCount} inactive`}
          </button>
        )}
      </div>

      {/* Count */}
      <p className="text-[9px] font-bold tracking-[0.25em] uppercase"
         style={{ color: "#3D3D3D", opacity: 0.35 }}>
        {query || hasFilters || needsReviewOnly
          ? `${filtered.length} match${filtered.length !== 1 ? "es" : ""}${pageCount > 1 ? ` · showing ${start}–${end}` : ""}`
          : `${activeCount} active · ${courses.length} total${pageCount > 1 ? ` · showing ${start}–${end}` : ""}`
        }
      </p>

      {/* List */}
      {filtered.length === 0 ? (
        <p className="text-xs text-center py-6" style={{ color: "#999" }}>
          {query ? `No courses matching "${search}"` : "No courses match the selected filters."}
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {pageSlice.map(c => (
            <CourseRowActions key={c.id} course={c} teachers={teachers} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between pt-1">
          <button onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="px-4 py-2 rounded-xl text-xs font-bold"
            style={{ background: "#F4F4F4", color: safePage === 0 ? "#BABABA" : "#3D3D3D",
                     border: "none", cursor: safePage === 0 ? "default" : "pointer" }}>
            ← Prev
          </button>
          <span className="text-[10px]" style={{ color: "#999" }}>
            {safePage + 1} / {pageCount}
          </span>
          <button onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))}
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
