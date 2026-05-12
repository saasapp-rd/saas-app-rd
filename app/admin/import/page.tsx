"use client"
import { useState, useRef, ChangeEvent } from "react"
import Link from "next/link"

// ── Types ────────────────────────────────────────────────────────────────────
interface ImportResult {
  processed?:      number
  coursesUpserted?: number
  enrollments?:    number
  skipped?:        number
  rowsSkipped?:    number
  warnings?:       string[]
  errors?:         string[]
  error?:          string
}

// ── Shared import card ────────────────────────────────────────────────────────
function ImportCard({
  title,
  description,
  columns,
  optional,
  notes,
  endpoint,
  resultLabel,
}: {
  title:       string
  description: string
  columns:     string[]   // required columns
  optional?:   string[]   // optional columns
  notes?:      string[]   // edge-case callouts shown to admin
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
    <div className="rounded-2xl border overflow-hidden"
         style={{ borderColor: "#EAEAEA" }}>

      {/* Header / toggle */}
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

          {/* Column reference */}
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest mb-2"
               style={{ color: "#3D3D3D", opacity: 0.4 }}>
              Required CSV columns
            </p>
            <div className="flex flex-wrap gap-1.5">
              {columns.map(c => (
                <code key={c}
                      className="text-[10px] px-2 py-0.5 rounded-lg font-mono"
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
                    <code key={c}
                          className="text-[10px] px-2 py-0.5 rounded-lg font-mono"
                          style={{ background: "#F7F7F7", color: "#999" }}>
                      {c}
                    </code>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Notes */}
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

          {/* File picker */}
          <div>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={pickFile}
              className="hidden"
            />
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full py-3 rounded-xl text-xs font-bold border"
              style={{
                borderColor: file ? "#A6192E" : "#EAEAEA",
                color:       file ? "#A6192E" : "#999",
                background:  "#FAFAFA", cursor: "pointer",
              }}>
              {file ? `📄 ${file.name}` : "Choose CSV file…"}
            </button>
          </div>

          {/* Import button */}
          {file && (
            <button
              onClick={submit}
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-bold text-white"
              style={{ background: "#A6192E", opacity: loading ? 0.6 : 1, border: "none", cursor: "pointer" }}>
              {loading ? "Importing…" : `Import ${file.name}`}
            </button>
          )}

          {/* Result */}
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

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ImportPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between"
              style={{ background: "#A6192E" }}>
        <div>
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">
            CSV Import
          </div>
          <div className="text-white text-[10px] opacity-70">
            Upload rosters &amp; schedules
          </div>
        </div>
      </header>

      <nav className="px-5 py-2 border-b flex items-center"
           style={{ borderColor: "#EAEAEA" }}>
        <Link href="/admin" className="text-xs font-bold"
              style={{ color: "#A6192E", textDecoration: "none" }}>
          &larr; Admin
        </Link>
      </nav>

      <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full flex flex-col gap-3">

        <p className="text-[9px] font-bold tracking-[0.25em] uppercase"
           style={{ color: "#3D3D3D", opacity: 0.35 }}>
          Import order: students → teachers → schedule
        </p>

        {/* ── Students ── */}
        <ImportCard
          title="Student Roster"
          description="Import all active students from Veracross or a spreadsheet"
          endpoint="/api/admin/import/students"
          columns={["student_id", "last_name", "call_by", "grade", "phone"]}
          optional={["first_name", "parent_email", "parent_name"]}
          notes={[
            "student_id is the Veracross/school ID number — used to match existing records on re-import.",
            "call_by is the student's preferred first name (e.g. 'Emma' not 'Emmaline').",
            "grade must be 9, 10, 11, or 12. Defaults to 9 if blank — fix manually after import.",
            "parent_email is needed for the email-home feature. Add it to your Veracross export.",
            "Re-uploading is safe: existing students are updated, not duplicated.",
            "Students not in the CSV are left active — deactivate manually via Manage Users.",
          ]}
          resultLabel={r =>
            r.processed
              ? `✓ ${r.processed} student${r.processed !== 1 ? "s" : ""} imported${r.skipped ? ` · ${r.skipped} skipped` : ""}`
              : "No records imported"
          }
        />

        {/* ── Teachers ── */}
        <ImportCard
          title="Teacher Roster"
          description="Import staff who need to log in and report absences"
          endpoint="/api/admin/import/teachers"
          columns={["last_name", "first_name", "email"]}
          optional={["phone", "employee_id"]}
          notes={[
            "email must be the @seattleacademy.org address — it is the login key.",
            "If a teacher already has an account, their name and phone are updated but their role is preserved.",
            "Use Manage Users to assign coordinator, counselor, dean, or admin roles after import.",
            "employee_id is optional but useful for matching future Veracross exports.",
          ]}
          resultLabel={r =>
            r.processed
              ? `✓ ${r.processed} teacher${r.processed !== 1 ? "s" : ""} imported${r.skipped ? ` · ${r.skipped} skipped` : ""}`
              : "No records imported"
          }
        />

        {/* ── Schedule ── */}
        <ImportCard
          title="Class Schedule"
          description="Import block assignments — which students are in which class each block"
          endpoint="/api/admin/import/schedule"
          columns={["block", "course_code", "course_name", "teacher_email", "student_id"]}
          optional={["room", "academic_year"]}
          notes={[
            "block is the period number (1–8). course_code must be unique per block (e.g. BIO401).",
            "teacher_email must match an existing user. Import teachers first.",
            "student_id must match an existing student. Import students first.",
            "academic_year defaults to '2025-26' if blank.",
            "⚠ Re-uploading REPLACES all enrollments for every course in the file. Courses not in the file are untouched.",
            "Each student can only be in one class per block. Conflicts are reported as errors.",
            "One row per student per class — repeat the course row for each enrolled student.",
          ]}
          resultLabel={r =>
            r.coursesUpserted !== undefined
              ? `✓ ${r.coursesUpserted} course${r.coursesUpserted !== 1 ? "s" : ""} · ${r.enrollments ?? 0} enrollment${(r.enrollments ?? 0) !== 1 ? "s" : ""}${r.rowsSkipped ? ` · ${r.rowsSkipped} skipped` : ""}`
              : "No records imported"
          }
        />

        {/* Template reference */}
        <div className="rounded-xl px-4 py-3 border mt-2"
             style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-1.5"
             style={{ color: "#3D3D3D", opacity: 0.4 }}>
            CSV Format Tips
          </p>
          <div className="flex flex-col gap-1">
            {[
              "Column headers are case-insensitive. Spaces or underscores both work.",
              "Export from Excel as UTF-8 CSV (File → Save As → CSV UTF-8).",
              "Phone numbers are normalised automatically — any format works.",
              "Empty rows and trailing whitespace are ignored.",
              "Columns not listed above are silently ignored.",
            ].map((tip, i) => (
              <p key={i} className="text-[10px]" style={{ color: "#999" }}>• {tip}</p>
            ))}
          </div>
        </div>

      </main>
    </div>
  )
}
