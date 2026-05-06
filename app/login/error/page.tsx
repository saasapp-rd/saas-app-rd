"use client"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Suspense } from "react"

const MESSAGES: Record<string, { title: string; body: string }> = {
  wrong_domain: {
    title: "Wrong Account",
    body:  "Only @seattleacademy.org Google accounts can sign in to this app.",
  },
  not_registered: {
    title: "Account Not Found",
    body:  "Your Google account exists but hasn't been added to the system. Contact your administrator to be added.",
  },
  db_error: {
    title: "Connection Error",
    body:  "Unable to reach the database. Please try again in a moment.",
  },
}

function ErrorInner() {
  const params = useSearchParams()
  const code   = params.get("error") ?? ""
  const msg    = MESSAGES[code] ?? {
    title: "Sign-in Failed",
    body:  "Something went wrong. Please try again.",
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6"
         style={{ background: "#fff" }}>
      <div className="w-full max-w-sm text-center">
        <div className="text-4xl mb-4">&#x26A0;&#xFE0F;</div>
        <h1 className="text-lg font-bold mb-2" style={{ color: "#A6192E" }}>{msg.title}</h1>
        <p className="text-sm mb-8" style={{ color: "#666" }}>{msg.body}</p>
        <Link
          href="/login"
          className="inline-block px-6 py-3 rounded-xl text-white text-sm font-bold"
          style={{ background: "#A6192E", textDecoration: "none" }}
        >
          Back to Sign In
        </Link>
      </div>
    </div>
  )
}

export default function LoginErrorPage() {
  return (
    <Suspense>
      <ErrorInner />
    </Suspense>
  )
}
