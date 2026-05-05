import NextAuth, { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      role:        string
      displayName: string
      userId:      string
    } & DefaultSession['user']
  }
  interface User {
    role:        string
    displayName: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role:        string
    displayName: string
    userId:      string
  }
}
