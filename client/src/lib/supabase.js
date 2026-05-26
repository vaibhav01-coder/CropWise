import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/** Maps PostgREST / Supabase errors to actionable messages for login/signup. */
export function formatSupabaseQueryError(err) {
  if (!err) return 'Something went wrong. Please try again.'
  const m = err.message || String(err)
  if (!supabaseUrl || !supabaseAnonKey) {
    return 'Missing Supabase env: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the repo root .env, then restart the dev server.'
  }
  if (/does not exist|schema cache|Could not find the table|relation.*farmers/i.test(m)) {
    return 'Database not set up: in Supabase → SQL Editor, run docs/registration-table.sql (creates the farmers table and policies).'
  }
  if (/Invalid API key|JWT|jwt|Malformed|authorization/i.test(m)) {
    return 'Supabase rejected the API key: copy the anon key from Project Settings → API into .env and restart the dev server.'
  }
  if (/row-level security|RLS|permission denied for table/i.test(m)) {
    return 'Row security blocked access: run docs/registration-table.sql in the SQL editor (includes policies for farmers).'
  }
  return m
}

// Simple localStorage session (no Supabase Auth needed)
const SESSION_KEY = 'beejrakshak_session'

export function getLocalSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.id && parsed?.mobile) return parsed
    return null
  } catch {
    return null
  }
}

export function setLocalSession(farmer) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    id: farmer.id,
    name: farmer.name,
    mobile: farmer.mobile,
  }))
}

export function clearLocalSession() {
  localStorage.removeItem(SESSION_KEY)
}
