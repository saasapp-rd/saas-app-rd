"use client"
import { useState, useMemo } from "react"
import CourseRowActions from "./CourseRowActions"
import type { CourseRow, TeacherOption } from "./CourseRowActions"

export default function CoursesList({
  courses,
  teachers,
}: {
  courses:  CourseRow[]
  teachers: TeacherOption[]
}) {
  const [showInactive, setShowInactive] = useState(false)

  const inactiveCount = useMemo(
    () => courses.filter(c => c.is_active === false).length,
    [courses]
  )
  const activeCount = courses.length - inactiveCount
  const display     = showInactive ? courses : courses.filter(c => c.is_active !== false)

  if (courses.length === 0) {
    return <p className="text-xs text-center py-8" style={{ color: "#999" }}>No courses yet.</p>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[9px] font-bold tracking-[0.25em] uppercase"
           style={{ color: "#3D3D3D", opacity: 0.35 }}>
          Courses &mdash; {activeCount} active
        </p>
        {inactiveCount > 0 && (
          <button onClick={() => setShowInactive(v => !v)}
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
      <div className="flex flex-col gap-1.5">
        {display.map(c => (
          <CourseRowActions key={c.id} course={c} teachers={teachers} />
        ))}
      </div>
    </div>
  )
}
