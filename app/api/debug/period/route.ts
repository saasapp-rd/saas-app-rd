// Wave 1 smoke-test endpoint — DELETE before production
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const url     = process.env.SUPABASE_URL            ?? ''
  const anon    = process.env.SUPABASE_ANON_KEY        ?? ''
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

  const results: Record<string, unknown> = {
    env: {
      url_set:     url.length > 0,
      url_prefix:  url.slice(0, 30),
      anon_len:    anon.length,
      service_len: service.length,
      service_prefix: service.slice(0, 12),
    },
  }

  // Test 1: anon client
  try {
    const anon_db = createClient(url, anon, { auth: { persistSession: false } })
    const { count, error } = await anon_db.from('users').select('*', { count: 'exact', head: true })
    results.anon_users = error ? { error: error.message, code: error.code } : { count }
  } catch (e) { results.anon_users_ex = String(e) }

  // Test 2: service role client
  try {
    const svc_db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
    const { count, error } = await svc_db.from('users').select('*', { count: 'exact', head: true })
    results.svc_users = error ? { error: error.message, code: error.code } : { count }
  } catch (e) { results.svc_users_ex = String(e) }

  // Test 3: service role on school_calendar
  try {
    const svc_db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data, error } = await svc_db.from('school_calendar').select('date,day_type,is_school_day').limit(3)
    results.svc_calendar = error ? { error: error.message, code: error.code } : { rows: data }
  } catch (e) { results.svc_calendar_ex = String(e) }

  return NextResponse.json(results, { status: 200 })
}
