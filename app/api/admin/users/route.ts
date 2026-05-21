import { NextRequest, NextResponse } from "next/server"
import { getServerSession }            from "next-auth"
import { authOptions }                 from "@/lib/auth"
import { db }                          from "@/lib/supabase"

const ALLOWED_ROLES = [
  "teacher", "advisor", "staff", "counselor", "nurse", "accommodations",
  "coordinator", "dean", "admin", "super_admin", "student", "parent",
]

// Hierarchy tier (ordering matters); specialist/peer tier has no internal priority.
const ROLE_HIERARCHY = ["super_admin", "admin", "dean", "coordinator"]

function primaryRole(roles: string[]): string {
  for (const r of ROLE_HIERARCHY) if (roles.includes(r)) return r
  // Peer tier: counselor, nurse, accommodations, teacher, advisor, staff — tiebreaker is first-in-array
  return roles[0] ?? "staff"
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !["admin","super_admin"].includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await db
    .from("users")
    .select("id, email, name, display_name, phone, role, roles, is_active, created_at")
    .order("role")
    .order("name")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !["admin","super_admin"].includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { email, display_name, phone } = body
  const roles: string[] | undefined = body.roles
  const roleField: string | undefined = body.role

  // Determine final roles array and primary role
  let finalRoles: string[]
  let finalRole: string

  if (roles && roles.length > 0) {
    if (!roles.every(r => ALLOWED_ROLES.includes(r)))
      return NextResponse.json({ error: "Invalid role in roles array" }, { status: 400 })
    finalRoles = roles
    finalRole  = primaryRole(roles)
  } else if (roleField) {
    if (!ALLOWED_ROLES.includes(roleField))
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    finalRoles = [roleField]
    finalRole  = roleField
  } else {
    return NextResponse.json({ error: "role or roles required" }, { status: 400 })
  }

  // Only super_admin can create super_admin accounts
  if (finalRoles.includes("super_admin") && session.user.role !== "super_admin")
    return NextResponse.json({ error: "Only super admins can create super admin accounts" }, { status: 403 })

  const isStudent = finalRole === "student"

  // Students don't require email; staff/teachers do
  if (!isStudent && (!email || !display_name))
    return NextResponse.json({ error: "email and display_name required" }, { status: 400 })
  if (isStudent && (!body.last_name || !body.first_name || !body.grade))
    return NextResponse.json({ error: "last_name, first_name, and grade required for students" }, { status: 400 })

  const record: Record<string, unknown> = {
    role:      finalRole,
    roles:     finalRoles,
    is_active: true,
    phone:     phone?.trim() || null,
  }

  if (isStudent) {
    const ln = String(body.last_name).trim()
    const fn = String(body.first_name).trim()
    record.last_name    = ln
    record.first_name   = fn
    record.call_by      = body.call_by ? String(body.call_by).trim() : fn
    record.grade        = Number(body.grade)
    record.name         = `${fn} ${ln}`
    record.display_name = `${fn} ${ln}`
    if (body.veracross_id) record.veracross_id = String(body.veracross_id).trim()
  } else {
    record.email        = email.toLowerCase().trim()
    record.name         = display_name.trim()
    record.display_name = display_name.trim()
    if (body.veracross_id) record.veracross_id = String(body.veracross_id).trim()
  }

  // Optional fields for any role
  if (body.business_phone !== undefined && body.business_phone !== null) {
    const bp = String(body.business_phone).trim()
    if (bp) record.business_phone = bp
  }
  if (body.job_title !== undefined && body.job_title !== null) {
    const jt = String(body.job_title).trim()
    if (jt) record.job_title = jt
  }
  if (Array.isArray(body.dean_grades) && body.dean_grades.length > 0) {
    record.dean_grades = body.dean_grades
      .filter((g: unknown) => typeof g === "number" && [9,10,11,12].includes(g))
  }

  const conflictCol = isStudent && body.veracross_id ? "veracross_id" : (email ? "email" : "id")

  const { data, error } = await db
    .from("users")
    .upsert(record, { onConflict: conflictCol })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { id, is_active, display_name, email, phone } = body
  const roles: string[] | undefined = body.roles
  const roleField: string | undefined = body.role

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  // Permission check is two-tier:
  //   admin / super_admin → can edit anything in this payload
  //   coordinator / counselor / dean → can ONLY toggle schedule_acknowledged
  //                                    (a low-stakes review-workflow flag)
  // Everyone else is rejected outright.
  const role         = session.user.role
  const isAdmin      = ["admin","super_admin"].includes(role)
  const isSchedAck   = ["coordinator","counselor","dean"].includes(role)
  const onlyAckField = Object.keys(body).every(k => k === "id" || k === "schedule_acknowledged")
                    && typeof body.schedule_acknowledged === "boolean"
  if (!isAdmin && !(isSchedAck && onlyAckField))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Prevent self-deactivation
  if (typeof is_active === "boolean" && !is_active && id === session.user.userId)
    return NextResponse.json({ error: "You cannot deactivate your own account." }, { status: 400 })

  const updates: Record<string, unknown> = {}

  if (typeof is_active === "boolean") updates.is_active = is_active

  if (roles && roles.length > 0) {
    if (!roles.every(r => ALLOWED_ROLES.includes(r)))
      return NextResponse.json({ error: "Invalid role in roles array" }, { status: 400 })
    if (roles.includes("super_admin") && session.user.role !== "super_admin")
      return NextResponse.json({ error: "Only super admins can assign super admin role" }, { status: 403 })
    updates.roles = roles
    updates.role  = primaryRole(roles)
  } else if (roleField) {
    if (!ALLOWED_ROLES.includes(roleField))
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    if (roleField === "super_admin" && session.user.role !== "super_admin")
      return NextResponse.json({ error: "Only super admins can assign super admin role" }, { status: 403 })
    updates.role  = roleField
    updates.roles = [roleField]
  }

  if (display_name?.trim()) {
    updates.display_name = display_name.trim()
    updates.name         = display_name.trim()
  }
  if (email?.trim()) {
    updates.email      = email.trim().toLowerCase()
    // Saving an email clears the auto-import "needs info" flag.
    updates.needs_info = false
  }
  if (phone !== undefined) updates.phone = phone ? phone.trim() || null : null
  if (body.business_phone !== undefined)
    updates.business_phone = body.business_phone
      ? String(body.business_phone).trim() || null
      : null
  if (body.dean_grades !== undefined && Array.isArray(body.dean_grades))
    updates.dean_grades = body.dean_grades
      .filter((g: unknown) => typeof g === "number" && [9,10,11,12].includes(g))
  if (body.job_title !== undefined)
    updates.job_title = body.job_title ? String(body.job_title).trim() || null : null

  // Student-specific fields
  const ln = body.last_name  !== undefined ? String(body.last_name).trim()  : undefined
  const fn = body.first_name !== undefined ? String(body.first_name).trim() : undefined
  if (ln) updates.last_name  = ln
  if (fn) updates.first_name = fn
  if (fn && ln) {
    updates.name         = `${fn} ${ln}`
    updates.display_name = `${fn} ${ln}`
  }
  if (body.call_by !== undefined)
    updates.call_by = body.call_by ? String(body.call_by).trim() : null
  if (body.grade !== undefined && body.grade !== null)
    updates.grade = Number(body.grade)
  if (body.veracross_id !== undefined)
    updates.veracross_id = body.veracross_id ? String(body.veracross_id).trim() : null
  if (typeof body.schedule_acknowledged === "boolean")
    updates.schedule_acknowledged = body.schedule_acknowledged

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })

  const { error } = await db.from("users").update(updates).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !["admin","super_admin"].includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
  if (id === session.user.userId)
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 })

  // Remove all related records before deleting (order matters for FK deps)
  // Step 1: delete incident notes that belong to this user's incidents (as student)
  const { data: ownIncidents } = await db
    .from("incidents")
    .select("id")
    .eq("student_id", id)
  const ownIds = (ownIncidents ?? []).map(r => r.id)

  await Promise.all([
    // Delete incident notes for this student's incidents first
    ownIds.length
      ? db.from("incident_notes").delete().in("incident_id", ownIds)
      : Promise.resolve(),
    // Null out reporter reference on incidents this person reported
    db.from("incidents").update({ reported_by: null }).eq("reported_by", id),
    // Null out locating-staff reference if applicable
    db.from("incidents").update({ located_by: null }).eq("located_by", id),
  ])

  // Step 2: now delete the student's own incidents, then everything else
  await Promise.all([
    ownIds.length
      ? db.from("incidents").delete().in("id", ownIds)
      : Promise.resolve(),
    db.from("student_enrollments").delete().eq("student_id", id),
    db.from("student_concern_flags").delete().eq("student_id", id),
    db.from("courses").update({ teacher_id: null }).eq("teacher_id", id),
    db.from("push_subscriptions").delete().eq("user_id", id),
  ])

  const { error } = await db.from("users").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
