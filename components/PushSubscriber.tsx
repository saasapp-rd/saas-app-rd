"use client"
import { useEffect } from "react"

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const output  = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i)
  return output
}

export default function PushSubscriber() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return
    if (!VAPID_PUBLIC_KEY) return

    const run = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js")
        const permission   = await Notification.requestPermission()
        if (permission !== "granted") return

        const existing = await registration.pushManager.getSubscription()
        const sub = existing ?? await registration.pushManager.subscribe({
          userVisibleOnly:      true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })

        const json = sub.toJSON()
        await fetch("/api/push/subscribe", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            endpoint: json.endpoint,
            p256dh:   json.keys?.p256dh,
            auth:     json.keys?.auth,
          }),
        })
      } catch (err) {
        console.debug("[PushSubscriber] setup failed:", err)
      }
    }

    run()
  }, [])

  return null
}
