import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

// After login, everyone goes to /missing EXCEPT students (future: parents too)
const ROLE_ROUTES: Record<string, string> = {
  super_admin: "/missing",
  admin:       "/missing",
  dean:        "/missing",
  coordinator: "/missing",
  counselor:   "/missing",
  teacher:     "/missing",
  staff:       "/missing",
  student:     "/student",
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  const route = ROLE_ROUTES[session.user.role] ?? "/login"
  redirect(route)
}
