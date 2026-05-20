"use client"
import { useEffect, useRef, useState, type ReactNode } from "react"

/**
 * Vertically-scrolling list with a fade-out + chevron indicator at the
 * bottom whenever there's more content below the visible area. macOS
 * Chrome hides native scrollbars and ignores most ::-webkit-scrollbar
 * tricks, so we render our own affordance instead.
 */
export default function ScrollList({
  children,
  maxHeight = 320,
  className = "",
  style,
}: {
  children:   ReactNode
  maxHeight?: number
  className?: string
  style?:     React.CSSProperties
}) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [moreBelow, setMoreBelow] = useState(false)
  const [moreAbove, setMoreAbove] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    function check() {
      if (!el) return
      const overflow = el.scrollHeight > el.clientHeight + 1
      setMoreAbove(overflow && el.scrollTop > 2)
      setMoreBelow(overflow && el.scrollTop + el.clientHeight < el.scrollHeight - 2)
    }
    check()
    el.addEventListener("scroll", check, { passive: true })
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => {
      el.removeEventListener("scroll", check)
      ro.disconnect()
    }
  }, [children])

  return (
    <div style={{ position: "relative" }}>
      <div
        ref={ref}
        className={className}
        style={{
          maxHeight,
          overflowY: "auto",
          overscrollBehavior: "contain",
          ...style,
        }}>
        {children}
      </div>

      {moreAbove && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 24,
          pointerEvents: "none", borderTopLeftRadius: 8, borderTopRightRadius: 8,
          background: "linear-gradient(to top, rgba(255,255,255,0), rgba(255,255,255,0.95))",
        }} />
      )}

      {moreBelow && (
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 36,
          pointerEvents: "none",
          borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
          background: "linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.95))",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          paddingBottom: 4,
        }}>
          <span style={{
            fontSize: 9, fontWeight: 800, letterSpacing: "0.1em",
            textTransform: "uppercase", color: "#A6192E",
            background: "#fff", padding: "2px 8px", borderRadius: 999,
            border: "1px solid #EAEAEA",
          }}>
            ↓ more below
          </span>
        </div>
      )}
    </div>
  )
}
