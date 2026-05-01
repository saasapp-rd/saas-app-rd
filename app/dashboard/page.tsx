import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

const ROLE_ROUTES: Record<string, string> = {
  super_admin: "/admin",
  admin:       "/admin",
  dean:        "/dean",
  coordinator: "/coordinator",
  counselor:   "/counselor",
  teacher:     "/teacher",
  staff:       "/staff",
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  const route = ROLE_ROUTES[session.user.role] ?? "/login"
  redirect(route)
}
