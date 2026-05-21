"use client"
import { useRouter } from "next/navigation"

/**
 * "Back" link that actually goes back. Uses browser history when the
 * user navigated into the page; falls back to a sensible default href
 * when they landed via direct URL (no history to pop).
 *
 * The label is intentionally generic — "← Back" — because the actual
 * previous page varies with navigation, and a hardcoded label like
 * "← Schedule" would be misleading whenever the user came from
 * somewhere else.
 */
export default function BackLink({
  fallbackHref,
  label = "Back",
}: {
  fallbackHref: string
  label?:       string
}) {
  const router = useRouter()

  function onClick(e: React.MouseEvent) {
    e.preventDefault()
    // history.length === 1 means this tab opened directly to the page —
    // there's nothing to go back to within the app, so head to the
    // sensible default instead.
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back()
    } else {
      router.push(fallbackHref)
    }
  }

  return (
    <a href={fallbackHref} onClick={onClick}
       className="text-xs font-bold"
       style={{ color: "#A6192E", textDecoration: "none", cursor: "pointer" }}>
      &larr; {label}
    </a>
  )
}
