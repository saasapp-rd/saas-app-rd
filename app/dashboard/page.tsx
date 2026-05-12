import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

const ROLE_DEST: Record<string, string> = {
  teacher:      "/teacher",
  staff:        "/staff",
  counselor:    "/counselor",
  coordinator:  "/coordinator",
  dean:         "/dean",
  admin:        "/admin",
  super_admin:  "/admin",
  student:      "/missing",
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const dest = ROLE_DEST[session.user.role] ?? "/missing"
  redirect(dest)
}
