import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/supabase"

const ALLOWED = ["admin", "super_admin"]

/**
 * POST /api/admin/counselor-caseload
 * Body: { counselor_id, student_id }
 *
 * Upserts the (counselor, student) pair on the partial unique index so
 * re-adding is idempotent. Multiple counselors can claim the same
 * student (separate rows).
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !ALLOWED.includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { counselor_id, student_id } = await req.json().catch(() => ({}))
  if (!counselor_id || !student_id)
    return NextResponse.json({ error: "counselor_id and student_id required" }, { status: 400 })

  const { error } = await db
    .from("counselor_caseload")
    .upsert(
      {
        counselor_id,
        student_id,
        assigned_by: session.user.userId,
      },
      { onConflict: "counselor_id,student_id" }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

/**
 * DELETE /api/admin/counselor-caseload
 * Body: { counselor_id, student_id }
 */
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !ALLOWED.includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { counselor_id, student_id } = await req.json().catch(() => ({}))
  if (!counselor_id || !student_id)
    return NextResponse.json({ error: "counselor_id and student_id required" }, { status: 400 })

  const { error } = await db
    .from("counselor_caseload")
    .delete()
    .eq("counselor_id", counselor_id)
    .eq("student_id",   student_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
