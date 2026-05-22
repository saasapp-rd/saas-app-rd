import { db } from "@/lib/supabase"
import WelfareConcernForm from "@/components/staff/WelfareConcernForm"

export const dynamic = "force-dynamic"

export default async function WelfareConcernPage() {
  const { data } = await db
    .from("users")
    .select("id, first_name, last_name, grade, call_by")
    .eq("role", "student")
    .eq("is_active", true)
    .order("last_name")

  const students = (data ?? []) as {
    id: string; first_name: string; last_name: string
    grade: number; call_by: string | null
  }[]

  return <WelfareConcernForm students={students} />
}
