import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/supabase"
import SignOutButton from "@/components/SignOutButton"
import TestModeBanner from "@/components/TestModeBanner"
import BackLink from "@/components/BackLink"
import Link from "next/link"

export const dynamic = "force-dynamic"

const ALLOWED       = ["coordinator","counselor","dean","admin","super_admin","teacher","staff"]
const PHONE_ALLOWED = ["coordinator","counselor","dean","admin","super_admin"]

interface StudentFull {
  id:                    string
  first_name:            string | null
  last_name:             string | null
  call_by:               string | null
  display_name:          string | null
  email:                 string | null
  grade:                 number | null
  veracross_id:          string | null
  phone:                 string | null
  parent_name:           string | null
  parent_email:          string | null
  advisor_name:          string | null
  is_active:             boolean | null
  schedule_acknowledged: boolean | null
  created_at:            string | null
}

export default async function StudentFullProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!ALLOWED.includes(session.user.role)) redirect("/dashboard")

  const { data: row } = await db
    .from("users")
    .select("id, first_name, last_name, call_by, display_name, email, grade, veracross_id, phone, parent_name, parent_email, advisor_name, is_active, schedule_acknowledged, created_at")
    .eq("id", id)
    .maybeSingle()
  if (!row) notFound()

  const stu = row as StudentFull
  const canSeePhone = PHONE_ALLOWED.includes(session.user.role)
  const isActive    = stu.is_active !== false
  const fullName    = [stu.last_name, stu.first_name].filter(Boolean).join(", ") || "Unknown"

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      <header className="px-5 py-3.5 flex items-center justify-between"
              style={{ background: "#A6192E" }}>
        <div className="min-w-0">
          <div className="text-white text-xs font-bold tracking-[0.2em] uppercase">Full Profile</div>
          <div className="text-white text-[10px] opacity-70 truncate">{fullName}</div>
        </div>
        <SignOutButton />
      </header>
      <TestModeBanner role={session.user.role} />

      <nav className="px-5 py-2 border-b flex items-center gap-4 flex-wrap" style={{ borderColor: "#EAEAEA" }}>
        <BackLink fallbackHref="/admin/users/student" />
        <Link href={`/students/${id}`} className="text-xs"
              style={{ color: "#999", textDecoration: "none" }}>
          Schedule
        </Link>
        <Link href={`/students/${id}/incidents`} className="text-xs"
              style={{ color: "#999", textDecoration: "none" }}>
          Missing Data
        </Link>
      </nav>

      <main className="flex-1 px-5 py-5 max-w-lg mx-auto w-full flex flex-col gap-4">

        {/* Hero */}
        <div className="rounded-xl border p-4" style={{ background: "#FAFAFA", borderColor: "#EAEAEA" }}>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black flex-shrink-0"
                 style={{ background: "#EAEAEA", color: "#888" }}>
              {(stu.last_name ?? "?")[0]}{(stu.first_name ?? "?")[0]}
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-black" style={{ color: "#3D3D3D" }}>{fullName}</h1>
              {stu.call_by && stu.call_by !== stu.first_name && (
                <p className="text-xs" style={{ color: "#999" }}>
                  Goes by <span style={{ color: "#3D3D3D", fontWeight: 600 }}>{stu.call_by}</span>
                </p>
              )}
            </div>
            <div className="ml-auto flex flex-col items-end gap-1">
              {!isActive && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase"
                      style={{ background: "#FEE2E2", color: "#CE2033" }}>
                  Inactive
                </span>
              )}
              {stu.schedule_acknowledged && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase"
                      style={{ background: "#FFF1D6", color: "#A06000" }}
                      title="Schedule variant has been acknowledged">
                  ✓ Variant OK
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Identity */}
        <Section title="Identity">
          <Field label="Last name"    value={stu.last_name} />
          <Field label="First name"   value={stu.first_name} />
          <Field label="Preferred"    value={stu.call_by} />
          <Field label="Display name" value={stu.display_name} dim />
          <Field label="Grade"        value={stu.grade != null ? `Grade ${stu.grade}` : null} />
          <Field label="Veracross ID" value={stu.veracross_id} mono />
        </Section>

        {/* Contact */}
        <Section title="Contact">
          {canSeePhone
            ? <Field label="Mobile" value={stu.phone} link={stu.phone ? `tel:${stu.phone}` : null} />
            : <Field label="Mobile" value={stu.phone ? "—" : null} dim />
          }
          <Field label="Email" value={stu.email} link={stu.email ? `mailto:${stu.email}` : null} />
        </Section>

        {/* Family */}
        <Section title="Family">
          <Field label="Parent name"  value={stu.parent_name} />
          <Field label="Parent email" value={stu.parent_email}
                 link={stu.parent_email ? `mailto:${stu.parent_email}` : null} />
        </Section>

        {/* Advisor + status */}
        <Section title="Advisor & Status">
          <Field label="Advisor" value={stu.advisor_name} />
          <Field label="Account status" value={isActive ? "Active" : "Deactivated"}
                 emphasis={isActive ? undefined : "alarm"} />
          <Field label="Schedule variant"
                 value={stu.schedule_acknowledged ? "Acknowledged (Variant OK)" : "Not acknowledged"}
                 dim={!stu.schedule_acknowledged} />
        </Section>

        {/* Account meta — admin-leaning detail at the bottom */}
        <Section title="Account">
          <Field label="Account ID" value={stu.id} mono dim />
          {stu.created_at && (
            <Field label="Created"
                   value={new Date(stu.created_at).toLocaleDateString("en-US", {
                     month: "short", day: "numeric", year: "numeric",
                   })}
                   dim />
          )}
        </Section>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[9px] font-bold tracking-[0.25em] uppercase mb-1.5"
         style={{ color: "#3D3D3D", opacity: 0.35 }}>
        {title}
      </p>
      <dl className="rounded-xl border px-4 py-3 grid gap-x-3 gap-y-1.5 text-xs"
          style={{ gridTemplateColumns: "auto 1fr", borderColor: "#EAEAEA", background: "#FAFAFA" }}>
        {children}
      </dl>
    </div>
  )
}

function Field({ label, value, mono, dim, emphasis, link }: {
  label:     string
  value:     string | number | null
  mono?:     boolean
  dim?:      boolean
  emphasis?: "alarm"
  link?:     string | null
}) {
  const display = value != null && value !== "" ? String(value) : "—"
  const empty   = display === "—"
  const color   = empty                  ? "#BABABA"
                : emphasis === "alarm"   ? "#CE2033"
                : dim                    ? "#999"
                :                          "#3D3D3D"
  return (
    <>
      <dt style={{ color: "#999" }}>{label}</dt>
      <dd style={{
        color,
        fontFamily: mono ? "monospace" : undefined,
        fontSize:   mono ? "11px" : undefined,
        wordBreak:  mono ? "break-all" : undefined,
      }}>
        {link && !empty
          ? <a href={link} style={{ color: "#1E5FA6", textDecoration: "none" }}>{display}</a>
          : display}
      </dd>
    </>
  )
}
