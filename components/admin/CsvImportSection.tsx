"use client"
import { useState, useRef, ChangeEvent } from "react"

interface ImportResult {
  processed?:           number
  coursesUpserted?:     number
  enrollments?:         number
  skipped?:             number
  rowsSkipped?:         number
  not_found?:           number
  teachers?:            number
  staff?:               number
  preserved?:           number
  inserted?:            number
  updated?:             number
  unmatched_teachers?:  string[]
  teacher_role_added?:  number
  advisory?:            number
  teachers_created?:    number
  students_enrolled?:   number
  students_not_found?:  number
  courses_not_found?:   number
  warnings?:            string[]
  errors?:              string[]
  error?:               string
}

function ImportCard({
  title, description, columns, optional, notes, endpoint, resultLabel,
}: {
  title:       string
  description: string
  columns:     string[]
  optional?:   string[]
  notes?:      string[]
  endpoint:    string
  resultLabel: (r: ImportResult) => string
}) {
  const inputRef              = useRef<HTMLInputElement>(null)
  const [file,    setFile]    = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState<ImportResult | null>(null)
  const [open,    setOpen]    = useState(false)

  function pickFile(e: ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null)
    setResult(null)
  }

  async function submit() {
    if (!file) return
    setLoading(true)
    setResult(null)
    const fd = new FormData()
    fd.append("file", file)
    try {
      const res  = await fetch(endpoint, { method: "POST", body: fd })
      const data = await res.json()
      setResult(data)
    } catch {
      setResult({ error: "Network error — please try again." })
    }
    setLoading(false)
  }

  const hasErrors   = result && (result.error || (result.errors?.length ?? 0) > 0)
  const hasWarnings = result?.warnings?.length ?? 0

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "#EAEAEA" }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-5 py-4 flex items-center justify-between text-left"
        style={{ background: open ? "#FFF8F8" : "#FAFAFA", border: "none", cursor: "pointer" }}>
        <div>
          <div className="text-sm font-bold" style={{ color: "#3D3D3D" }}>{title}</div>
          <div className="text-[10px] mt-0.5" style={{ color: "#999" }}>{description}</div>
        </div>
        <span className="text-base" style={{ color: open ? "#A6192E" : "#BABABA" }}>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && (
        <div className="px-5 py-4 border-t flex flex-col gap-4"
             style={{ borderColor: "#EAEAEA", background: "#fff" }}>

          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest mb-2"
               style={{ color: "#3D3D3D", opacity: 0.4 }}>
              Required columns
            </p>
            <div className="flex flex-wrap gap-1.5">
              {columns.map(c => (
                <code key={c} className="text-[10px] px-2 py-0.5 rounded-lg font-mono"
                      style={{ background: "#F0F0F0", color: "#3D3D3D" }}>
                  {c}
                </code>
              ))}
            </div>
            {optional && optional.length > 0 && (
              <>
                <p className="text-[9px] font-bold uppercase tracking-widest mt-2.5 mb-1.5"
                   style={{ color: "#3D3D3D", opacity: 0.3 }}>
                  Optional columns
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {optional.map(c => (
                    <code key={c} className="text-[10px] px-2 py-0.5 rounded-lg font-mono"
                          style={{ background: "#F7F7F7", color: "#999" }}>
                      {c}
                    </code>
                  ))}
                </div>
              </>
            )}
          </div>

          {notes && notes.length > 0 && (
            <div className="rounded-xl px-4 py-3 flex flex-col gap-1.5"
                 style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}>
              <p className="text-[9px] font-bold uppercase tracking-widest"
                 style={{ color: "#92400E" }}>
                Notes
              </p>
              {notes.map((n, i) => (
                <p key={i} className="text-[10px]" style={{ color: "#78350F" }}>{n}</p>
              ))}
            </div>
          )}

          <div>
            <input ref={inputRef} type="file" accept=".csv,.tsv,text/csv"
                   onChange={pickFile} className="hidden" />
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full py-3 rounded-xl text-xs font-bold border"
              style={{
                borderColor: file ? "#A6192E" : "#EAEAEA",
                color:       file ? "#A6192E" : "#999",
                background: "#FAFAFA", cursor: "pointer",
              }}>
              {file ? `📄 ${file.name}` : "Choose CSV file…"}
            </button>
          </div>

          {file && (
            <button
              onClick={submit}
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold text-white"
              style={{ background: "#A6192E", opacity: loading ? 0.6 : 1, border: "none", cursor: "pointer" }}>
              {loading ? "Importing…" : `Import ${file.name}`}
            </button>
          )}

          {result && (
            <div className="rounded-xl px-4 py-3 flex flex-col gap-2"
                 style={{
                   background: hasErrors ? "#FFF0F0" : "#F0FDF4",
                   border:     `1px solid ${hasErrors ? "#FECACA" : "#BBF7D0"}`,
                 }}>
              {result.error ? (
                <p className="text-xs font-bold" style={{ color: "#CE2033" }}>{result.error}</p>
              ) : (
                <p className="text-xs font-bold"
                   style={{ color: hasErrors ? "#CE2033" : "#166534" }}>
                  {resultLabel(result)}
                </p>
              )}
              {!!hasWarnings && (
                <div>
                  <p className="text-[9px] font-bold uppercase mb-1" style={{ color: "#92400E" }}>
                    Warnings ({hasWarnings})
                  </p>
                  <div className="flex flex-col gap-0.5 max-h-32 overflow-y-auto">
                    {result.warnings!.map((w, i) => (
                      <p key={i} className="text-[10px]" style={{ color: "#78350F" }}>{w}</p>
                    ))}
                  </div>
                </div>
              )}
              {!!result.errors?.length && (
                <div>
                  <p className="text-[9px] font-bold uppercase mb-1" style={{ color: "#CE2033" }}>
                    Errors ({result.errors.length})
                  </p>
                  <div className="flex flex-col gap-0.5 max-h-40 overflow-y-auto">
                    {result.errors.map((e, i) => (
                      <p key={i} className="text-[10px]" style={{ color: "#7F1D1D" }}>{e}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function CsvImportSection() {
  return (
    <div className="flex flex-col gap-3">

      <p className="text-[9px] font-bold tracking-[0.25em] uppercase"
         style={{ color: "#3D3D3D", opacity: 0.35 }}>
        Import order: Faculty &amp; Staff → Students → Parents → Course Schedule → Student Enrollments
      </p>

      {/* ── 1. Faculty & Staff ── */}
      <ImportCard
        title="Faculty &amp; Staff"
        description="All faculty and staff from Veracross — Faculty → teacher, Staff → staff"
        endpoint="/api/admin/import/teachers"
        columns={["Last Name", "Preferred Name", "Email 1", "Role"]}
        optional={["Person ID", "Job Title", "Mobile Phone", "Business Phone"]}
        notes={[
          "Export the Faculty/Staff report from Veracross and upload as-is.",
          "Role = 'Faculty' → teacher · Role = 'Staff' → staff.",
          "Email 1 is the login key — must be the school email address.",
          "Coordinators, counselors, deans, and admins already in the system keep their role on re-import.",
          "After import, use Manage Users to promote people to coordinator, counselor, dean, etc.",
        ]}
        resultLabel={r =>
          r.processed
            ? `✓ ${r.processed} imported · ${r.teachers ?? 0} teachers · ${r.staff ?? 0} staff${r.preserved ? ` · ${r.preserved} role${r.preserved !== 1 ? "s" : ""} preserved` : ""}${r.skipped ? ` · ${r.skipped} skipped` : ""}`
            : "No records imported"
        }
      />

      {/* ── 2. Students ── */}
      <ImportCard
        title="Students"
        description="Student roster from Veracross — matched and updated by Person ID on re-import"
        endpoint="/api/admin/import/students"
        columns={["Person ID", "Last Name", "Preferred Name", "Current Grade"]}
        optional={["Gender", "Email 1", "Mobile Phone", "Advisor"]}
        notes={[
          "Export the Student Roster report from Veracross and upload as-is.",
          "Person ID is the match key — re-uploading updates existing students, never duplicates.",
          "Preferred Name is used as the student's first name and display name.",
          "Current Grade accepts 'Grade 9' or '9' — both work.",
          "Advisor is stored as-is from Veracross ('Last, First') and used to build advisory groups.",
        ]}
        resultLabel={r =>
          r.processed
            ? `✓ ${r.processed} student${r.processed !== 1 ? "s" : ""} imported${r.skipped ? ` · ${r.skipped} skipped` : ""}`
            : "No records imported"
        }
      />

      {/* ── 3. Parents ── */}
      <ImportCard
        title="Parent Contacts"
        description="Parent/guardian contacts from Veracross — linked to students by Person ID"
        endpoint="/api/admin/import/parents"
        columns={["Person ID", "PARENT 1: Preferred Name", "PARENT 1: Last Name", "PARENT 1: Email 1"]}
        optional={["PARENT 1: Mobile Phone", "PARENT 1: Person ID", "PARENT 2 – 4 same columns"]}
        notes={[
          "Export the Parent Contact report from Veracross and upload as-is.",
          "Students must be imported first — matched by Person ID.",
          "Up to 4 parents per student. Empty parent slots are skipped automatically.",
          "Re-uploading replaces parent data on existing students.",
        ]}
        resultLabel={r =>
          r.processed != null
            ? `✓ ${r.processed} student${r.processed !== 1 ? "s" : ""} updated${r.not_found ? ` · ${r.not_found} student${r.not_found !== 1 ? "s" : ""} not found` : ""}`
            : "No records imported"
        }
      />

      {/* ── 4. Course Schedule ── */}
      <ImportCard
        title="Course Schedule"
        description="Class list from Veracross — matched and updated by Class ID on re-import"
        endpoint="/api/admin/import/courses"
        columns={["Course", "Class ID", "Description", "Teacher", "TEACHER: Person ID", "Meeting Times"]}
        optional={["School Level", "Primary Grade Level", "Room"]}
        notes={[
          "Faculty & Staff must be imported first — courses match teachers by Person ID, then by 'Last, First' name across all non-student roles.",
          "If a matched person is in the system as staff (or coordinator, dean, etc.) the 'teacher' role is added to their roles silently — their primary role is not changed.",
          "Teachers not in the system are created automatically with minimal info and flagged 'Needs Info'. Review them on the Manage Users hub to add email and contact details.",
          "Class ID is the dedup key (e.g. 'ACAL2001-11'); Course is the course code (e.g. 'ACAL2001') used to group sections; Description is the course name.",
          "Block number is parsed from Meeting Times via 'B<N>' (e.g. 'Odd-FwdOdd-Rev-B3-US' → block 3).",
          "Rows where Course = 'Advisory' (or Description contains 'Advisory') are imported into block 9 — the advisory slot.",
        ]}
        resultLabel={r =>
          r.processed
            ? `✓ ${r.processed} course${r.processed !== 1 ? "s" : ""} processed · ${r.inserted ?? 0} new · ${r.updated ?? 0} updated${(r.advisory ?? 0) > 0 ? ` · ${r.advisory} advisory` : ""}${(r.teachers_created ?? 0) > 0 ? ` · ${r.teachers_created} new teacher${r.teachers_created !== 1 ? "s" : ""} created (needs info)` : ""}${(r.teacher_role_added ?? 0) > 0 ? ` · teacher role added to ${r.teacher_role_added}` : ""}`
            : "No records imported"
        }
      />

      {/* ── 5. Student Enrollments ── */}
      <ImportCard
        title="Student Enrollments"
        description="Class enrollments from Veracross — connects each student to their courses by Class ID"
        endpoint="/api/admin/import/enrollments"
        columns={["Person ID", "Class Enrollments"]}
        optional={["Last Name", "Current Grade", "Advisor"]}
        notes={[
          "Students and Course Schedule must be imported first.",
          "Class Enrollments is a comma-separated list of 'Class ID: Description' pairs — the importer reads each Class ID and matches against the courses table.",
          "Re-uploading FULLY REPLACES each student's enrollments for the academic year — Veracross is the source of truth, dropped classes are removed.",
          "Advisor column updates users.advisor_name on each student.",
          "Unknown students or unknown Class IDs are listed in warnings; the rest of the import continues.",
        ]}
        resultLabel={r =>
          r.processed
            ? `✓ ${r.students_enrolled ?? 0} student${r.students_enrolled !== 1 ? "s" : ""} enrolled · ${r.enrollments ?? 0} enrollment${r.enrollments !== 1 ? "s" : ""}${(r.courses_not_found ?? 0) > 0 ? ` · ${r.courses_not_found} unknown course${r.courses_not_found !== 1 ? "s" : ""}` : ""}${(r.students_not_found ?? 0) > 0 ? ` · ${r.students_not_found} student${r.students_not_found !== 1 ? "s" : ""} not in system` : ""}`
            : "No records imported"
        }
      />

    </div>
  )
}
