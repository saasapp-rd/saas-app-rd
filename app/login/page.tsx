"use client"
import { Suspense } from "react"
import LoginForm, { type DevAccount } from "@/components/LoginForm"

// Tester-facing login. Super-admin intentionally hidden — the
// /devlogin page exposes the full set including super-admin for
// developer use. Both go away once SSO is live for everyone.
const ACCOUNTS: DevAccount[] = [
  { username: "admin",       label: "Admin"       },
  { username: "dean",        label: "Dean"        },
  { username: "coordinator", label: "Coordinator" },
  { username: "counselor",   label: "Counselor"   },
  { username: "teacher",     label: "Teacher"     },
  { username: "staff",       label: "Staff"       },
  { username: "student",     label: "Student"     },
]

export default function LoginPage() {
  const banner = process.env.NEXT_PUBLIC_SHOW_DEV_BANNER !== "false"
    ? "Dev / Test Mode — Use Google SSO above or quick-select below"
    : undefined
  return (
    <Suspense>
      <LoginForm
        accounts={ACCOUNTS}
        banner={banner}
        devNote="Dev accounts use password: saas2026"
      />
    </Suspense>
  )
}
