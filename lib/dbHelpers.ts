/**
 * Paginate a PostgREST query through Supabase's 1000-row cap.
 *
 * Usage:
 *   const rows = await fetchAllPaginated<{ course_id: string }>(() =>
 *     db.from("student_enrollments")
 *       .select("course_id")
 *       .eq("academic_year", "2025-26")
 *   )
 *
 * PostgREST honors `Range` headers up to `db-max-rows` (default 1000 on
 * Supabase). Tables larger than that need to be fetched in chunks.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
export async function fetchAllPaginated<T>(buildQuery: () => any): Promise<T[]> {
  const CHUNK = 1000
  const out: T[] = []
  let from = 0
  const MAX_ITERS = 100  // 100 * 1000 = 100k rows ceiling
  for (let i = 0; i < MAX_ITERS; i++) {
    const { data, error } = await buildQuery().range(from, from + CHUNK - 1)
    if (error) break
    if (!data || data.length === 0) break
    out.push(...(data as T[]))
    if (data.length < CHUNK) break
    from += CHUNK
  }
  return out
}
