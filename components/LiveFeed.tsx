"use client"
import { useEffect, useState } from "react"
import { useRouter }           from "next/navigation"

type Status = "connecting" | "live" | "reconnecting"

const DOT: Record<Status, string> = {
  connecting:   "#9CA3AF",   // grey
  live:         "#22C55E",   // green
  reconnecting: "#F59E0B",   // amber
}

const LABEL: Record<Status, string> = {
  connecting:   "Connecting",
  live:         "Live",
  reconnecting: "Reconnecting",
}

interface Props {
  /** Extra Tailwind / inline classes for the wrapper span */
  className?: string
}

export default function LiveFeed({ className = "" }: Props) {
  const router           = useRouter()
  const [status, setStatus] = useState<Status>("connecting")

  useEffect(() => {
    let es: EventSource

    function connect() {
      es = new EventSource("/api/realtime/incidents")

      es.addEventListener("connected", () => setStatus("live"))

      es.addEventListener("change", () => {
        router.refresh()
      })

      es.onerror = () => {
        setStatus("reconnecting")
        // EventSource will auto-reconnect after ~3 s (browser spec)
        // When it does, the "connected" event fires again.
      }
    }

    connect()
    return () => es?.close()
  }, [router])

  return (
    <span
      className={"inline-flex items-center gap-1 " + className}
      title={"Realtime: " + LABEL[status]}
    >
      <span
        style={{
          display:      "inline-block",
          width:        6,
          height:       6,
          borderRadius: "50%",
          background:   DOT[status],
          // pulse animation only when live
          animation:    status === "live" ? "lf-pulse 2s ease-in-out infinite" : undefined,
        }}
      />
      <span
        className="text-[9px] font-bold tracking-widest uppercase"
        style={{ color: "rgba(255,255,255,0.6)" }}
      >
        {LABEL[status]}
      </span>

      {/* Keyframes injected once — harmless if rendered multiple times */}
      <style>{`
        @keyframes lf-pulse {
          0%, 100% { opacity: 1;   transform: scale(1);    }
          50%       { opacity: 0.4; transform: scale(1.35); }
        }
      `}</style>
    </span>
  )
}
