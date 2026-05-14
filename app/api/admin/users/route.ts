import { NextRequest, NextResponse } from "next/server"
import { getServerSession }            from "next-auth"
import { authOptions }                 from "@/lib/auth"
import { db }                          from "@/lib/supabase"

const ALLOWED_ROLES = [
  "teacher", "advisor", "staff", "counselor", "coordinator", "dean",
  "admin", "super_admin", "student", "parent",
]

// Highest-priority role in an array, used to set the primary `role` field
const ROLE_PRIORITY = [
  "super_admin", "admin", "dean", "coordinator",
  "counselor", "teacher", "advisor", "staff", "student", "parent",
]

function primaryRole(roles: string[]): string {
  for (const r of ROLE_PRIORITY) {
    if (roles.includes(r)) return r
  }
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
  if (!session || !["admin","super_admin"].includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { id, is_active, display_name, email, phone } = body
  const roles: string[] | undefined = body.roles
  const roleField: string | undefined = body.role

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

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
  if (email?.trim())       updates.email = email.trim().toLowerCase()
  if (phone !== undefined) updates.phone = phone ? phone.trim() || null : null

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

  const { error } = await db.from("users").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
