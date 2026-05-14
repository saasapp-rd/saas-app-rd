"use client"
import { useState, useRef, ChangeEvent } from "react"

interface ImportResult {
  processed?:       number
  coursesUpserted?: number
  enrollments?:     number
  skipped?:         number
  rowsSkipped?:     number
  warnings?:        string[]
  errors?:          string[]
  error?:           string
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
              Required CSV columns
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
                ⚠ Notes
              </p>
              {notes.map((n, i) => (
                <p key={i} className="text-[10px]" style={{ color: "#78350F" }}>{n}</p>
              ))}
            </div>
          )}

          <div>
            <input ref={inputRef} type="file" accept=".csv,text/csv"
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
        CSV Import — students → teachers → schedule
      </p>

      <ImportCard
        title="Student Roster"
        description="Import from Veracross — export the student roster report as CSV or Excel"
        endpoint="/api/admin/import/students"
        columns={["Person ID", "Last Name", "Preferred Name", "Current Grade"]}
        optional={["Gender", "Email 1", "Mobile Phone", "Advisor"]}
        notes={[
          "These are the exact Veracross column names — export the roster report and upload as-is.",
          "Person ID is used to match students on re-import, so existing records are updated, not duplicated.",
          "Preferred Name is used as the student's first name and display name.",
          "Current Grade can be '9' or 'Grade 9' — both work.",
          "Advisor format from Veracross is 'Last, First' — stored as-is on the student record.",
        ]}
        resultLabel={r =>
          r.processed
            ? `✓ ${r.processed} student${r.processed !== 1 ? "s" : ""} imported${r.skipped ? ` · ${r.skipped} skipped` : ""}`
            : "No records imported"
        }
      />

      <ImportCard
        title="Teacher Roster"
        description="Import staff who need to log in and report absences"
        endpoint="/api/admin/import/teachers"
        columns={["last_name", "first_name", "email"]}
        optional={["phone", "employee_id"]}
        notes={[
          "email must be the @seattleacademy.org address — it is the login key.",
          "If a teacher already has an account, name and phone are updated; role is preserved.",
          "Use Manage Users to assign coordinator, counselor, dean, or admin roles after import.",
        ]}
        resultLabel={r =>
          r.processed
            ? `✓ ${r.processed} teacher${r.processed !== 1 ? "s" : ""} imported${r.skipped ? ` · ${r.skipped} skipped` : ""}`
            : "No records imported"
        }
      />

      <ImportCard
        title="Class Schedule"
        description="Import block assignments — which students are in which class each block"
        endpoint="/api/admin/import/schedule"
        columns={["block", "course_code", "course_name", "teacher_email", "student_id"]}
        optional={["room", "academic_year"]}
        notes={[
          "block is the period number (1–8). course_code must be unique per block.",
          "teacher_email must match an existing user. Import teachers first.",
          "student_id must match an existing student. Import students first.",
          "⚠ Re-uploading REPLACES all enrollments for every course in the file.",
        ]}
        resultLabel={r =>
          r.coursesUpserted !== undefined
            ? `✓ ${r.coursesUpserted} course${r.coursesUpserted !== 1 ? "s" : ""} · ${r.enrollments ?? 0} enrollment${(r.enrollments ?? 0) !== 1 ? "s" : ""}${r.rowsSkipped ? ` · ${r.rowsSkipped} skipped` : ""}`
            : "No records imported"
        }
      />
    </div>
  )
}
