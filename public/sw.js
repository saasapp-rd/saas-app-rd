// Service Worker — SAAS Missing Students Tracker
// Handles push notifications and notification clicks

self.addEventListener("push", (event) => {
  let data = {}
  try { data = event.data?.json() ?? {} } catch (_) {}

  const title   = data.title ?? "SAAS Alert"
  const options = {
    body:  data.body  ?? "",
    icon:  "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [200, 100, 200],
    data: { url: data.url ?? "/missing" },
    actions: [
      { action: "open",    title: "Open" },
      { action: "dismiss", title: "Dismiss" },
    ],
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  if (event.action === "dismiss") return

  const targetUrl = event.notification.data?.url ?? "/missing"
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus existing tab if already open
      for (const client of clientList) {
        if ("focus" in client) {
          client.focus()
          client.navigate?.(targetUrl)
          return
        }
      }
      // Otherwise open new tab
      if (clients.openWindow) return clients.openWindow(targetUrl)
    })
  )
})

self.addEventListener("install",  () => self.skipWaiting())
self.addEventListener("activate", (e) => e.waitUntil(clients.claim()))
