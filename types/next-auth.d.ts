import NextAuth, { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      role:        string
      roles:       string[]
      displayName: string
      userId:      string
    } & DefaultSession['user']
  }
  interface User {
    role:        string
    roles:       string[]
    displayName: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role:        string
    roles:       string[]
    displayName: string
    userId:      string
  }
}
