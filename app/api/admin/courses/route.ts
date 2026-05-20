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

  const { name, class_id, teacher_id, block_number, room } = await req.json()
  if (!name || !block_number)
    return NextResponse.json({ error: "name and block_number required" }, { status: 400 })

  const cleanClassId = typeof class_id === "string" ? class_id.trim() : null
  const { data, error } = await db.from("courses")
    .insert({
      name,
      class_id:     cleanClassId || null,
      teacher_id:   teacher_id || null,
      block_number: Number(block_number),
      room:         room || null,
    })
    .select().single()
  if (error) {
    // Surface the partial unique index conflict with a friendlier message.
    const msg = /class_id/i.test(error.message)
      ? `Class ID "${cleanClassId}" is already used by another course.`
      : error.message
    return NextResponse.json({ error: msg }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !ADMIN.includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { id } = body
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (body.name?.trim())               updates.name         = body.name.trim()
  if (body.block_number != null)       updates.block_number = Number(body.block_number)
  if (body.room !== undefined)         updates.room         = body.room ? body.room.trim() : null
  if ("teacher_id" in body)            updates.teacher_id   = body.teacher_id ?? null
  if ("class_id" in body)              updates.class_id     = body.class_id ? String(body.class_id).trim() || null : null
  if (typeof body.is_active === "boolean") updates.is_active = body.is_active

  if (Object.keys(updates).length === 0)
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })

  const { error } = await db.from("courses").update(updates).eq("id", id)
  if (error) {
    const msg = /class_id/i.test(error.message)
      ? `Class ID "${updates.class_id}" is already used by another course.`
      : error.message
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  // Keep enrollments.block_number in sync. Placeholder courses are inserted
  // with a null block on every related enrollment; once admin assigns a
  // block here, propagate it down so teacher rosters and analytics see them.
  if (updates.block_number !== undefined) {
    await db.from("student_enrollments")
      .update({ block_number: updates.block_number })
      .eq("course_id", id)
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !ADMIN.includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const { error } = await db.from("courses").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
