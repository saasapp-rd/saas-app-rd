"use client"
import { signIn } from "next-auth/react"
import { useState, FormEvent } from "react"
import Image from "next/image"

const ACCOUNTS = [
  { username: "superadmin",  label: "Super Admin"    },
  { username: "admin",       label: "Admin"          },
  { username: "dean",        label: "Dean"           },
  { username: "coordinator", label: "Coordinator"    },
  { username: "counselor",   label: "Counselor"      },
  { username: "teacher",     label: "Teacher"        },
  { username: "staff",       label: "Staff"          },
]

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError]       = useState("")
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const res = await signIn("credentials", {
      username,
      password,
      redirect: true,
      callbackUrl: "/dashboard",
    })
    if (res?.error) {
      setError("Incorrect username or password.")
      setLoading(false)
    }
  }

  function quickLogin(u: string) {
    setUsername(u)
    setPassword("saas2026")
    setError("")
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#fff" }}>
      {/* Top bar */}
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

      {/* Dev banner */}
      <div
        className="px-4 py-2 text-center text-xs font-bold"
        style={{ background: "#FFF8E0", color: "#6B4C00", borderBottom: "1px solid #F0C040" }}
      >
        🔧 Dev / Test Mode &mdash; Use quick-select below or type credentials manually
      </div>

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

          {/* Quick-select role buttons */}
          <div className="mb-6">
            <p
              className="text-[9px] font-bold tracking-[0.25em] uppercase text-center mb-3"
              style={{ color: "#3D3D3D", opacity: 0.35 }}
            >
              Quick select (dev only)
            </p>
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

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px" style={{ background: "#EAEAEA" }} />
            <div className="w-2 h-2 rotate-45 flex-shrink-0" style={{ background: "#A6192E" }} />
            <div className="flex-1 h-px" style={{ background: "#EAEAEA" }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl text-sm border outline-none transition-all"
              style={{
                borderColor: "#EAEAEA",
                background: "#FAFAFA",
                color: "#3D3D3D",
              }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl text-sm border outline-none"
              style={{
                borderColor: "#EAEAEA",
                background: "#FAFAFA",
                color: "#3D3D3D",
              }}
            />

            {error && (
              <p className="text-xs font-semibold text-center" style={{ color: "#CE2033" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl text-white text-sm font-semibold tracking-wide transition-opacity"
              style={{ background: "#A6192E", opacity: loading ? 0.6 : 1 }}
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p
            className="mt-6 text-center text-[10px]"
            style={{ color: "#3D3D3D", opacity: 0.35 }}
          >
            All test accounts use password: <strong>saas2026</strong>
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
