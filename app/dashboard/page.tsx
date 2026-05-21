import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

// Maps each role to its "Dashboard" tab destination (the first tab in
// the bottom nav). After login, every user lands on their own dashboard.
const ROLE_DEST: Record<string, string> = {
  teacher:      "/teacher",     // Classes
  staff:        "/staff",
  counselor:    "/counselor",
  coordinator:  "/coordinator",
  dean:         "/dean",
  admin:        "/admin",
  super_admin:  "/admin",
  student:        "/student",
  nurse:          "/missing",
  accommodations: "/missing",
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const dest = ROLE_DEST[session.user.role] ?? "/missing"
  redirect(dest)
}
