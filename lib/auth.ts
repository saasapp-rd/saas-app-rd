import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { createServerClient } from './supabase'

// ── Test accounts (DEV ONLY) ───────────────────────────────────────────────────
// All use password: saas2026
// Replaced by Google OAuth in Wave 8.
const TEST_USERS = [
  { id: '00000000-0000-0000-0000-000000000001', username: 'superadmin',  password: 'saas2026', role: 'super_admin',  displayName: 'Super Admin',         email: 'superadmin@test.saas' },
  { id: '00000000-0000-0000-0000-000000000002', username: 'admin',       password: 'saas2026', role: 'admin',        displayName: 'Admin User',          email: 'admin@test.saas' },
  { id: '00000000-0000-0000-0000-000000000003', username: 'dean',        password: 'saas2026', role: 'dean',         displayName: 'Dean Martinez',       email: 'dean@test.saas' },
  { id: '00000000-0000-0000-0000-000000000004', username: 'coordinator', password: 'saas2026', role: 'coordinator',  displayName: 'Will (Coordinator)',   email: 'coordinator@test.saas' },
  { id: '00000000-0000-0000-0000-000000000005', username: 'counselor',   password: 'saas2026', role: 'counselor',    displayName: 'Dr. Park (Counselor)', email: 'counselor@test.saas' },
  { id: '00000000-0000-0000-0000-000000000006', username: 'teacher',     password: 'saas2026', role: 'teacher',      displayName: 'Ms. Jones (Teacher)',  email: 'teacher@test.saas' },
  { id: '00000000-0000-0000-0000-000000000007', username: 'staff',       password: 'saas2026', role: 'staff',        displayName: 'Staff Member',         email: 'staff@test.saas' },
  { id: '00000000-0000-0000-0000-000000000008', username: 'student',     password: 'saas2026', role: 'student',      displayName: 'Test Student',         email: 'student@test.saas' },
]

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Test Account',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // 1. Match test account
        const testUser = TEST_USERS.find(
          (u) => u.username === credentials?.username && u.password === credentials?.password
        )
        if (!testUser) return null

        // 2. Try to look up / upsert user in Supabase to get DB-assigned role
        //    Falls back to TEST_USERS role if DB is unavailable.
        try {
          const supabase = createServerClient()
          const { data: dbUser } = await supabase
            .from('users')
            .select('id, role, name')
            .eq('email', testUser.email)
            .single()

          if (dbUser) {
            return {
              id:          dbUser.id,
              name:        dbUser.name,
              email:       testUser.email,
              role:        dbUser.role,
              displayName: dbUser.name,
            }
          }

          // User not in DB yet — upsert with fixed UUID so seed IDs stay stable
          await supabase.from('users').upsert({
            id:           testUser.id,
            email:        testUser.email,
            name:         testUser.displayName,
            display_name: testUser.displayName,
            role:         testUser.role,
          }, { onConflict: 'email' })
        } catch (err) {
          console.warn('Supabase unavailable — using test role fallback', err)
        }

        return {
          id:          testUser.id,
          name:        testUser.displayName,
          email:       testUser.email,
          role:        testUser.role,
          displayName: testUser.displayName,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role        = (user as any).role
        token.displayName = (user as any).displayName
        token.userId      = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role        = token.role as string
        session.user.displayName = token.displayName as string
        ;(session.user as any).userId = token.userId
      }
      return session
    },
  },
  pages:   { signIn: '/login' },
  session: { strategy: 'jwt' },
  secret:  process.env.NEXTAUTH_SECRET,
}
