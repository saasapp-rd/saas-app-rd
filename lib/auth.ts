import { NextAuthOptions } from "next-auth"
import CredentialsProvider   from "next-auth/providers/credentials"
import GoogleProvider        from "next-auth/providers/google"
import { createServerClient } from "./supabase"

const SCHOOL_DOMAIN = "seattleacademy.org"

// ── Test accounts (DEV ONLY — password: saas2026) ─────────────────────────────
const TEST_USERS = [
  { id: "00000000-0000-0000-0000-000000000001", username: "superadmin",  password: "saas2026", role: "super_admin",  displayName: "Super Admin",          email: "superadmin@test.saas" },
  { id: "00000000-0000-0000-0000-000000000002", username: "admin",       password: "saas2026", role: "admin",        displayName: "Admin User",           email: "admin@test.saas" },
  { id: "00000000-0000-0000-0000-000000000003", username: "dean",        password: "saas2026", role: "dean",         displayName: "Dean Martinez",        email: "dean@test.saas" },
  { id: "00000000-0000-0000-0000-000000000004", username: "coordinator", password: "saas2026", role: "coordinator",  displayName: "Will (Coordinator)",   email: "coordinator@test.saas" },
  { id: "00000000-0000-0000-0000-000000000005", username: "counselor",   password: "saas2026", role: "counselor",    displayName: "Dr. Park (Counselor)", email: "counselor@test.saas" },
  { id: "00000000-0000-0000-0000-000000000006", username: "teacher",     password: "saas2026", role: "teacher",      displayName: "Ms. Jones (Teacher)",  email: "teacher@test.saas" },
  { id: "00000000-0000-0000-0000-000000000007", username: "staff",       password: "saas2026", role: "staff",        displayName: "Staff Member",         email: "staff@test.saas" },
  { id: "00000000-0000-0000-0000-000000000008", username: "student",       password: "saas2026", role: "student",        displayName: "Test Student",              email: "student@test.saas" },
  { id: "00000000-0000-0000-0000-000000000009", username: "nurse",         password: "saas2026", role: "nurse",          displayName: "Nurse Johnson",             email: "nurse@test.saas" },
  { id: "00000000-0000-0000-0000-000000000010", username: "accommodations", password: "saas2026", role: "accommodations", displayName: "Ms. Chen (Accommodations)", email: "accommodations@test.saas" },
]

export const authOptions: NextAuthOptions = {
  providers: [

    // ── Google OAuth (Wave 8 — activates when env vars are present) ────────────
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID     ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          hd:     SCHOOL_DOMAIN,  // hint Google to show @seattleacademy.org accounts first
          prompt: "select_account",
        },
      },
    }),

    // ── Credentials (dev / test accounts) ──────────────────────────────────────
    CredentialsProvider({
      name: "Test Account",
      credentials: {
        username: { label: "Username", type: "text"     },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const testUser = TEST_USERS.find(
          u => u.username === credentials?.username && u.password === credentials?.password
        )
        if (!testUser) return null

        try {
          const supabase = createServerClient()
          const { data: dbUser } = await supabase
            .from("users")
            .select("id, role, roles, display_name")
            .eq("email", testUser.email)
            .single()

          if (dbUser) {
            return {
              id:          dbUser.id,
              name:        dbUser.display_name,
              email:       testUser.email,
              role:        dbUser.role,
              roles:       (dbUser as any).roles ?? [dbUser.role],
              displayName: dbUser.display_name,
            }
          }

          // Upsert with stable UUID so seeded IDs remain consistent
          await supabase.from("users").upsert({
            id:           testUser.id,
            email:        testUser.email,
            name:         testUser.displayName,
            display_name: testUser.displayName,
            role:         testUser.role,
          }, { onConflict: "email" })
        } catch (err) {
          console.warn("Supabase unavailable — using test role fallback", err)
        }

        return {
          id:          testUser.id,
          name:        testUser.displayName,
          email:       testUser.email,
          role:        testUser.role,
          roles:       [testUser.role],
          displayName: testUser.displayName,
        }
      },
    }),
  ],

  callbacks: {
    // Block Google sign-ins from outside the school domain
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email?.endsWith("@" + SCHOOL_DOMAIN)) {
          return "/login?error=wrong_domain"
        }
        // Ensure the person exists in the users table (admin must add them first)
        try {
          const supabase = createServerClient()
          const { data } = await supabase
            .from("users")
            .select("id")
            .eq("email", user.email)
            .single()
          if (!data) return "/login?error=not_registered"
        } catch {
          return "/login?error=db_error"
        }
      }
      return true
    },

    async jwt({ token, user, account }) {
      // Credentials sign-in — role/roles already attached by authorize()
      if (user && (user as any).role) {
        token.role        = (user as any).role
        token.roles       = (user as any).roles ?? [(user as any).role]
        token.displayName = (user as any).displayName
        token.userId      = user.id
      }

      // Google sign-in (account only present on initial sign-in)
      if (account?.provider === "google" && token.email) {
        try {
          const supabase = createServerClient()
          const { data: dbUser } = await supabase
            .from("users")
            .select("id, role, roles, display_name")
            .eq("email", token.email)
            .single()
          if (dbUser) {
            token.userId      = dbUser.id
            token.role        = dbUser.role
            token.roles       = (dbUser as any).roles ?? [dbUser.role]
            token.displayName = dbUser.display_name ?? token.name
          }
        } catch (err) {
          console.error("Google jwt lookup error:", err)
        }
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.role        = token.role as string
        session.user.roles       = (token.roles as string[]) ?? [token.role as string]
        session.user.displayName = token.displayName as string
        session.user.userId      = token.userId as string
      }
      return session
    },
  },

  pages:   { signIn: "/login" },
  session: { strategy: "jwt" },
  secret:  process.env.NEXTAUTH_SECRET,
}
