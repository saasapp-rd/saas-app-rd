import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

// ─── Test accounts ─────────────────────────────────────────────────────────────
// DEV ONLY — all accounts use password: saas2026
// Replace this entire provider with Google when SSO is ready.
const TEST_USERS = [
  { id: "1", username: "superadmin",  password: "saas2026", role: "super_admin",  displayName: "Super Admin" },
  { id: "2", username: "admin",       password: "saas2026", role: "admin",        displayName: "Admin User" },
  { id: "3", username: "dean",        password: "saas2026", role: "dean",         displayName: "Dean Martinez" },
  { id: "4", username: "coordinator", password: "saas2026", role: "coordinator",  displayName: "Will (Coordinator)" },
  { id: "5", username: "counselor",   password: "saas2026", role: "counselor",    displayName: "Dr. Park (Counselor)" },
  { id: "6", username: "teacher",     password: "saas2026", role: "teacher",      displayName: "Ms. Jones (Teacher)" },
  { id: "7", username: "staff",       password: "saas2026", role: "staff",        displayName: "Staff Member" },
  { id: "8", username: "student",     password: "saas2026", role: "student",      displayName: "Test Student" },
]

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Test Account",
      credentials: {
        username: { label: "Username", type: "text",     placeholder: "e.g. teacher" },
        password: { label: "Password", type: "password", placeholder: "saas2026"    },
      },
      async authorize(credentials) {
        const user = TEST_USERS.find(
          (u) =>
            u.username === credentials?.username &&
            u.password === credentials?.password
        )
        if (!user) return null
        return { id: user.id, name: user.displayName, role: user.role, displayName: user.displayName }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.displayName = user.displayName
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role
        session.user.displayName = token.displayName
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
}
