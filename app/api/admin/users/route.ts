import { NextRequest, NextResponse } from "next/server"
import { getServerSession }            from "next-auth"
import { authOptions }                 from "@/lib/auth"
import { db }                          from "@/lib/supabase"

const ALLOWED_ROLES = ["teacher","staff","counselor","coordinator","dean","admin","super_admin","student"]

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !["admin","super_admin"].includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await db
    .from("users")
    .select("id, email, name, display_name, role, is_active, created_at")
    .order("role")
    .order("name")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !["admin","super_admin"].includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { email, display_name, role } = await req.json()
  if (!email || !display_name || !role)
    return NextResponse.json({ error: "email, display_name, and role required" }, { status: 400 })
  if (!ALLOWED_ROLES.includes(role))
    return NextResponse.json({ error: "Invalid role" }, { status: 400 })

  const { data, error } = await db
    .from("users")
    .upsert({
      email:        email.toLowerCase().trim(),
      name:         display_name.trim(),
      display_name: display_name.trim(),
      role,
      is_active:    true,
    }, { onConflict: "email" })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !["admin","super_admin"].includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id, is_active, role, display_name, email } = await req.json()
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  // Prevent self-deactivation
  if (typeof is_active === "boolean" && !is_active && id === session.user.userId)
    return NextResponse.json({ error: "You cannot deactivate your own account." }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (typeof is_active === "boolean")          updates.is_active    = is_active
  if (role && ALLOWED_ROLES.includes(role))    updates.role         = role
  if (display_name?.trim()) {
    updates.display_name = display_name.trim()
    updates.name         = display_name.trim()
  }
  if (email?.trim()) {
    updates.email = email.trim().toLowerCase()
  }

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })

  const { error } = await db.from("users").update(updates).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
