import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/supabase"

const ADMIN = ["admin", "super_admin"]
const YEAR  = "2025-26"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !ADMIN.includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await db
    .from("coordinator_assignments")
    .select("block_number, coordinator_id, users(display_name)")
    .order("block_number")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !ADMIN.includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { block_number, coordinator_id } = await req.json()
  if (!block_number || !coordinator_id)
    return NextResponse.json({ error: "block_number and coordinator_id required" }, { status: 400 })

  // Upsert on (block, coordinator, year) — idempotent if already assigned.
  // Requires migration 017_multi_coordinator.sql to have been applied.
  const { data, error } = await db
    .from("coordinator_assignments")
    .upsert(
      { block_number: Number(block_number), coordinator_id, academic_year: YEAR },
      { onConflict: "block_number,coordinator_id,academic_year" }
    )
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 200 })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !ADMIN.includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { block_number, coordinator_id } = await req.json()
  if (!block_number || !coordinator_id)
    return NextResponse.json({ error: "block_number and coordinator_id required" }, { status: 400 })

  const { error } = await db
    .from("coordinator_assignments")
    .delete()
    .eq("block_number", Number(block_number))
    .eq("coordinator_id", coordinator_id)
    .eq("academic_year", YEAR)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
