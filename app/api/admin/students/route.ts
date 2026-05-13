import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/supabase"

const ADMIN = ["admin", "super_admin"]

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !ADMIN.includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await db
    .from("users").select("*").eq("role", "student").eq("is_active", true)
    .order("last_name").order("first_name")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !ADMIN.includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()

  // Bulk insert
  if (body.bulk) {
    const rows = (body.bulk as { first_name: string; last_name: string; grade: number; student_id?: string }[])
      .filter(s => s.first_name && s.last_name && s.grade >= 6 && s.grade <= 12)
    if (!rows.length) return NextResponse.json({ error: "No valid rows" }, { status: 400 })
    const rowsWithRole = rows.map(r => ({ ...r, role: "student" }))
    const { data, error } = await db.from("users").insert(rowsWithRole).select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ count: data.length }, { status: 201 })
  }

  // Single insert
  const { first_name, last_name, grade, student_id } = body
  if (!first_name || !last_name || !grade)
    return NextResponse.json({ error: "first_name, last_name, grade required" }, { status: 400 })

  const { data, error } = await db.from("users")
    .insert({ first_name, last_name, grade: Number(grade), veracross_id: student_id || null, role: "student" })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
