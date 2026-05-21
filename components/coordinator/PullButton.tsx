"use client"
import { useState } from "react"
import PullForm from "./PullForm"

export default function PullButton({ inline = false }: { inline?: boolean }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {inline ? (
        <button
          onClick={() => setOpen(true)}
          className="px-5 py-2 rounded-xl text-xs font-bold text-white"
          style={{ background: "#A6192E" }}>
          + Report Missing Student
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="px-3 py-1.5 rounded-lg text-[10px] font-bold text-white"
          style={{ background: "#A6192E" }}>
          + Report Missing
        </button>
      )}

      {open && <PullForm onCancel={() => setOpen(false)} />}
    </>
  )
}
