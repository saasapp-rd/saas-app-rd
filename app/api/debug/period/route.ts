// Wave 1 smoke-test endpoint — DELETE before production
// GET /api/debug/period
// Returns: current period, block number, DB connection status

import { NextResponse } from 'next/server'
import { getCurrentPeriod } from '@/lib/schedule'
import { db } from '@/lib/supabase'

export async function GET() {
  const results: Record<string, unknown> = {}

  // 1. Period detection
  try {
    results.period = await getCurrentPeriod()
  } catch (err) {
    results.period_error = String(err)
  }

  // 2. Supabase connection — count users (service role)
  try {
    const { count, error } = await db
      .from('users')
      .select('*', { count: 'exact', head: true })
    results.supabase = error ? { error: error.message } : { connected: true, user_count: count }
  } catch (err) {
    results.supabase_error = String(err)
  }

  // 3. Calendar row for today
  try {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await db
      .from('school_calendar')
      .select('date, day_type, is_school_day, note')
      .eq('date', today)
      .single()
    results.today_calendar = error ? { error: error.message } : data
  } catch (err) {
    results.calendar_error = String(err)
  }

  return NextResponse.json(results, { status: 200 })
}
