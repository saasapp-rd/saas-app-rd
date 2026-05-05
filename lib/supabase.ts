import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.SUPABASE_URL!
const anonKey      = process.env.SUPABASE_ANON_KEY!
const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY!

// ── Server client (service role — bypasses RLS, server-side only) ─────────────
// Use this in API routes and server components where the user is already
// authenticated via next-auth and we trust the session role.
export function createServerClient() {
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })
}

// ── Browser client (anon key — respects RLS) ──────────────────────────────────
// Use this for client-side Realtime subscriptions (Wave 7).
// Never expose service key to the browser.
export function createBrowserClient() {
  return createClient(supabaseUrl, anonKey)
}

// ── Convenience: default server client ────────────────────────────────────────
export const db = createServerClient()
