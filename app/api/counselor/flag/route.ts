import { NextRequest, NextResponse } from "next/server"
import { getServerSession }            from "next-auth"
import { authOptions }                 from "@/lib/auth"
import { db }                          from "@/lib/supabase"

const ALLOWED = ["counselor","dean","admin","super_admin"]

// POST /api/counselor/flag  — add or update a flag
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !ALLOWED.includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { student_id, flag_level, public_note } = await req.json()
  if (!student_id || !flag_level)
    return NextResponse.json({ error: "student_id and flag_level required" }, { status: 400 })

  const VALID_LEVELS = ["watch","elevated","emergency"]
  if (!VALID_LEVELS.includes(flag_level))
    return NextResponse.json({ error: "Invalid flag_level" }, { status: 400 })

  const { data, error } = await db
    .from("student_concern_flags")
    .insert({
      student_id,
      flag_level,
      public_note:  public_note?.trim() ?? null,
      flagged_by:   session.user.userId,
    })
    .select("id, flag_level, public_note, flagged_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// DELETE /api/counselor/flag?id=<flag_id>
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !ALLOWED.includes(session.user.role))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const flagId = req.nextUrl.searchParams.get("id")
  if (!flagId)
    return NextResponse.json({ error: "id required" }, { status: 400 })

  const { error } = await db
    .from("student_concern_flags")
    .delete()
    .eq("id", flagId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
