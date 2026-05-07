import { NextRequest, NextResponse } from "next/server"
import { getServerSession }            from "next-auth"
import { authOptions }                 from "@/lib/auth"
import { db }                          from "@/lib/supabase"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? ""
  if (q.length < 2)
    return NextResponse.json({ students: [] })

  // Search by first or last name (case-insensitive prefix / contains)
  const { data, error } = await db
    .from("students")
    .select("id, first_name, last_name, grade")
    .or(
      "last_name.ilike." + q + "%," +
      "first_name.ilike." + q + "%," +
      "last_name.ilike.%" + q + "%"
    )
    .eq("is_active", true)
    .order("last_name")
    .order("first_name")
    .limit(12)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ students: data ?? [] })
}
