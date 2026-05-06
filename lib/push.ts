import webpush from "web-push"
import { db } from "./supabase"

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT ?? "mailto:admin@seattleacademy.org",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
)

export interface PushPayload {
  title: string
  body:  string
  url?:  string
}

interface SubRow {
  endpoint: string
  p256dh:   string
  auth:     string
}

async function sendToSubs(subs: SubRow[], payload: PushPayload) {
  if (!subs.length) return
  const body = JSON.stringify(payload)
  await Promise.allSettled(
    subs.map(s =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        body,
      )
    )
  )
}

/** Send push notification to every subscribed user with the given role */
export async function sendPushToRole(role: string, payload: PushPayload): Promise<void> {
  const { data: users } = await db.from("users").select("id").eq("role", role)
  if (!users?.length) return
  const ids = users.map(u => u.id)
  const { data: subs } = await db
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("user_id", ids)
  await sendToSubs((subs ?? []) as SubRow[], payload)
}

/** Send push notification to a specific user */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  const { data: subs } = await db
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId)
  await sendToSubs((subs ?? []) as SubRow[], payload)
}
