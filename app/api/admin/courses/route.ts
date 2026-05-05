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
    .from("courses")
    .select("id, name, block_number, room, academic_year, users(display_name)")
    .eq("is_active", true)
    .order("block_number").order("name")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !ADMIN.includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { name, teacher_id, block_number, room } = await req.json()
  if (!name || !block_number)
    return NextResponse.json({ error: "name and block_number required" }, { status: 400 })

  const { data, error } = await db.from("courses")
    .insert({ name, teacher_id: teacher_id || null, block_number: Number(block_number), room: room || null })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
