"use client"
import { Suspense } from "react"
import LoginForm, { type DevAccount } from "@/components/LoginForm"

// Developer-only login. Same UI as /login but includes the
// super-admin account in the quick-pick list. Not linked from
// anywhere else — testers won't stumble on it.
// Sunset along with /login once Google SSO is live for all roles.
const ACCOUNTS: DevAccount[] = [
  { username: "superadmin",  label: "Super Admin"  },
  { username: "admin",       label: "Admin"        },
  { username: "dean",        label: "Dean"         },
  { username: "coordinator", label: "Coordinator"  },
  { username: "counselor",   label: "Counselor"    },
  { username: "teacher",     label: "Teacher"      },
  { username: "staff",       label: "Staff"        },
  { username: "student",     label: "Student"      },
]

export default function DevLoginPage() {
  return (
    <Suspense>
      <LoginForm
        accounts={ACCOUNTS}
        banner="Dev Login — full role set including Super Admin"
        devNote="Dev accounts use password: saas2026"
      />
    </Suspense>
  )
}
