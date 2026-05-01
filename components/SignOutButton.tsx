"use client"
import { signOut } from "next-auth/react"

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-[10px] font-bold tracking-[0.15em] uppercase px-3 py-1.5 rounded-lg"
      style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}
    >
      Sign Out
    </button>
  )
}
