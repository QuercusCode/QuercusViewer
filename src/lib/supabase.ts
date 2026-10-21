import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Exported so callers can show a visible warning instead of this module
// silently falling back to a placeholder client that fails every
// Supabase-dependent feature (auth, AI chat, saving structures) far from
// this root cause. Kept as a fallback rather than throwing here, since this
// module is imported at the top of the dependency graph (including by
// tests, which run with no .env at all) and a throw would break every test,
// not just warn about a real misconfiguration.
export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey

if (!isSupabaseConfigured) {
    console.warn('Supabase URL or Anon Key is missing. Check your .env file.')
}

export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key'
)
