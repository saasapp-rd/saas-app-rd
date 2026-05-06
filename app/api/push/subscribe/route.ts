import { NextRequest, NextResponse } from "next/server"
import { getServerSession }               from "next-auth"
import { authOptions }                    from "@/lib/auth"
import { db }                             from "@/lib/supabase"

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { endpoint, p256dh, auth } = await req.json()
  if (!endpoint || !p256dh || !auth)
    return NextResponse.json({ error: "Missing subscription fields" }, { status: 400 })

  const { error } = await db.from("push_subscriptions").upsert(
    { user_id: session.user.userId, endpoint, p256dh, auth },
    { onConflict: "user_id,endpoint" }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { endpoint } = await req.json()
  if (!endpoint) return NextResponse.json({ error: "endpoint required" }, { status: 400 })

  await db.from("push_subscriptions")
    .delete()
    .eq("user_id", session.user.userId)
    .eq("endpoint", endpoint)

  return NextResponse.json({ ok: true })
}
