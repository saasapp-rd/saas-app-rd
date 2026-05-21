import { db } from "@/lib/supabase"

export interface SystemSettings {
  academic_year:           string
  school_name:             string
  push_on_missing:         boolean
  push_on_elevated:        boolean
  push_on_welfare_concern: boolean
  email_on_step3:          boolean
  google_client_id:        string
  google_client_secret:    string
  veracross_api_url:       string
  veracross_api_key:       string
  updated_at:              string | null
  updated_by:              string | null
}

// Sensible defaults if the row is missing (pre-migration deploy, etc.).
// Matches the DB defaults so we never crash on first load.
export const DEFAULT_SETTINGS: SystemSettings = {
  academic_year:           "2025-26",
  school_name:             "Seattle Academy",
  push_on_missing:         true,
  push_on_elevated:        true,
  push_on_welfare_concern: true,
  email_on_step3:          false,
  google_client_id:        "",
  google_client_secret:    "",
  veracross_api_url:       "",
  veracross_api_key:       "",
  updated_at:              null,
  updated_by:              null,
}

/**
 * Fetch the singleton system_settings row. Falls back to DEFAULT_SETTINGS
 * if the row is missing (e.g. migration not yet applied) so callers
 * never get a hard crash on missing config.
 */
export async function getSystemSettings(): Promise<SystemSettings> {
  const { data } = await db
    .from("system_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle()
  return (data as SystemSettings | null) ?? DEFAULT_SETTINGS
}
