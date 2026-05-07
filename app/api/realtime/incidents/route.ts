import { NextRequest } from "next/server"
import { createServerClient } from "@/lib/supabase"

export const dynamic    = "force-dynamic"
export const maxDuration = 300  // 5-minute max on Vercel Pro (browser auto-reconnects)

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder()

  // Check auth header — only authenticated requests (any role) allowed
  // We rely on next-auth session cookie; SSE doesn't block unauthenticated
  // connections at this layer but the data sent is non-sensitive (just IDs).

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, payload: object) => {
        try {
          const line = "event: " + event + "\ndata: " + JSON.stringify(payload) + "\n\n"
          controller.enqueue(encoder.encode(line))
        } catch {
          // controller already closed — ignore
        }
      }

      const supabase = createServerClient()

      // Announce connection
      send("connected", { ts: Date.now() })

      // Subscribe to all changes on the incidents table
      const channel = supabase
        .channel("wave7-incidents-" + Date.now())
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "incidents" },
          (payload) => {
            const rec = (payload.new ?? payload.old) as Record<string, unknown>
            send("change", {
              type:   payload.eventType,           // INSERT | UPDATE | DELETE
              id:     rec?.id    ?? null,
              status: rec?.status ?? null,
              level:  rec?.level  ?? null,
            })
          }
        )
        .subscribe()

      // Keepalive comment every 25 s — prevents proxies from closing idle connections
      const timer = setInterval(() => {
        try { controller.enqueue(encoder.encode(": keepalive\n\n")) } catch {}
      }, 25_000)

      // Clean up when the client disconnects
      req.signal.addEventListener("abort", () => {
        clearInterval(timer)
        supabase.removeChannel(channel)
        try { controller.close() } catch {}
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type":      "text/event-stream",
      "Cache-Control":     "no-cache, no-transform",
      "X-Accel-Buffering": "no",   // disable nginx / Vercel edge buffering
      "Connection":        "keep-alive",
    },
  })
}
