"use client"
import { signIn } from "next-auth/react"
import { useState, FormEvent } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import { Suspense } from "react"

const ACCOUNTS = [
  { username: "superadmin",  label: "Super Admin"  },
  { username: "admin",       label: "Admin"        },
  { username: "dean",        label: "Dean"         },
  { username: "coordinator", label: "Coordinator"  },
  { username: "counselor",   label: "Counselor"    },
  { username: "teacher",     label: "Teacher"      },
  { username: "staff",       label: "Staff"        },
  { username: "student",     label: "Student"      },
]

const SSO_ERRORS: Record<string, string> = {
  wrong_domain:   "Only @seattleacademy.org accounts can sign in.",
  not_registered: "Your account hasn't been added to the system yet. Contact your administrator.",
  db_error:       "Unable to verify your account. Please try again.",
  OAuthSignin:    "Google sign-in failed. Please try again.",
  OAuthCallback:  "Google sign-in failed. Please try again.",
}

function LoginInner() {
  const params   = useSearchParams()
  const errParam = params.get("error") ?? ""

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError]       = useState(SSO_ERRORS[errParam] ?? "")
  const [loading, setLoading]   = useState(false)
  const [gLoading, setGLoading] = useState(false)

  async function handleGoogle() {
    setGLoading(true)
    setError("")
    await signIn("google", { callbackUrl: "/dashboard" })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const res = await signIn("credentials", {
      username,
      password,
      redirect:    false,
      callbackUrl: "/dashboard",
    })
    if (res?.error) {
      setError("Incorrect username or password.")
      setLoading(false)
    } else if (res?.url) {
      window.location.href = res.url
    }
  }

  function quickLogin(u: string) {
    setUsername(u)
    setPassword("saas2026")
    setError("")
  }

  const googleEnabled = !!(
    process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    process.env.NEXT_PUBLIC_GOOGLE_SSO_ENABLED === "true"
  )

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      {/* Header */}
      <header
        className="px-5 py-3.5 flex items-center justify-between"
        style={{ background: "#A6192E" }}
      >
        <span className="text-white text-xs font-bold tracking-[0.25em] uppercase">
          Seattle Academy
        </span>
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-white opacity-40" />
          <span className="w-1.5 h-1.5 rounded-full bg-white opacity-70" />
          <span className="w-1.5 h-1.5 rounded-full bg-white opacity-100" />
        </div>
      </header>

      {/* Dev banner (hidden in production when test accounts aren't needed) */}
      {process.env.NEXT_PUBLIC_SHOW_DEV_BANNER !== "false" && (
        <div
          className="px-4 py-2 text-center text-xs font-bold"
          style={{ background: "#FFF8E0", color: "#6B4C00", borderBottom: "1px solid #F0C040" }}
        >
          Dev / Test Mode &mdash; Use Google SSO above or quick-select below
        </div>
      )}

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <Image
              src="/images/SAASLogo.png"
              alt="SAAS Seattle Academy"
              width={220}
              height={73}
              priority
              className="h-auto mb-4"
            />
            <p className="text-sm font-semibold" style={{ color: "#3D3D3D", opacity: 0.6 }}>
              Sign in to continue
            </p>
          </div>

          {/* Global error */}
          {error && (
            <div
              className="mb-4 px-4 py-3 rounded-xl text-xs font-semibold text-center"
              style={{ background: "#FFF0F0", color: "#A6192E", border: "1px solid #FFCCCC" }}
            >
              {error}
            </div>
          )}

          {/* ── Google SSO button ── */}
          <button
            onClick={handleGoogle}
            disabled={gLoading}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl border text-sm font-semibold transition-all mb-2"
            style={{
              borderColor: "#DADCE0",
              background:  gLoading ? "#F8F8F8" : "#fff",
              color:       "#3D3D3D",
              opacity:     gLoading ? 0.7 : 1,
            }}
          >
            {/* Google G logo */}
            {!gLoading ? (
              <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
                <path d="M44.5 20H24v8.5h11.8C34.7 33.9 29.9 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21c10.5 0 20-7.8 20-21 0-1.3-.2-2.7-.5-4z" fill="#FFC107"/>
                <path d="M6.3 14.7l7 5.1C15.1 16.1 19.2 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 5.1 29.6 3 24 3c-7.6 0-14.2 4.3-17.7 10.7z" fill="#FF3D00"/>
                <path d="M24 45c5.8 0 10.7-1.9 14.6-5.2l-6.7-5.5C29.7 35.9 26.9 37 24 37c-5.8 0-10.7-3.9-11.8-9.2l-7 5.4C8 39.4 15.4 45 24 45z" fill="#4CAF50"/>
                <path d="M44.5 20H24v8.5h11.8c-.6 2.9-2.4 5.3-4.9 6.8l6.7 5.5C42 37.1 45 31 45 24c0-1.3-.2-2.7-.5-4z" fill="#1976D2"/>
              </svg>
            ) : (
              <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            )}
            {gLoading ? "Redirecting to Google…" : "Sign in with Google"}
          </button>

          <p className="text-center text-[10px] mb-6" style={{ color: "#999" }}>
            @seattleacademy.org accounts only
          </p>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ background: "#EAEAEA" }} />
            <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "#BABABA" }}>
              or dev accounts
            </span>
            <div className="flex-1 h-px" style={{ background: "#EAEAEA" }} />
          </div>

          {/* Quick-select role buttons */}
          <div className="mb-5">
            <div className="grid grid-cols-4 gap-2">
              {ACCOUNTS.map((a) => (
                <button
                  key={a.username}
                  onClick={() => quickLogin(a.username)}
                  className="py-2 rounded-lg text-[10px] font-bold transition-all"
                  style={{
                    background: username === a.username ? "#A6192E" : "#EAEAEA",
                    color:      username === a.username ? "#fff"     : "#3D3D3D",
                  }}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Credentials form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl text-sm border outline-none"
              style={{ borderColor: "#EAEAEA", background: "#FAFAFA", color: "#3D3D3D" }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl text-sm border outline-none"
              style={{ borderColor: "#EAEAEA", background: "#FAFAFA", color: "#3D3D3D" }}
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-white text-sm font-semibold tracking-wide transition-opacity"
              style={{ background: "#A6192E", opacity: loading ? 0.6 : 1 }}
            >
              {loading ? "Signing in…" : "Sign In (Dev)"}
            </button>
          </form>

          <p className="mt-4 text-center text-[10px]" style={{ color: "#3D3D3D", opacity: 0.35 }}>
            Dev accounts use password: <strong>saas2026</strong>
          </p>
        </div>
      </main>

      <footer className="px-6 py-5 text-center border-t" style={{ borderColor: "#EAEAEA" }}>
        <p className="text-[9px] tracking-[0.2em] uppercase" style={{ color: "#3D3D3D", opacity: 0.3 }}>
          &copy; 2026 Seattle Academy of Arts &amp; Sciences
        </p>
      </footer>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  )
}
