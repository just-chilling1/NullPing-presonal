import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase-env'

const supabaseUrl = getSupabaseUrl()
const supabaseAnonKey = getSupabaseAnonKey()

if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window === 'undefined') {
        console.error('CRITICAL: Missing Supabase environment variables on server side')
    }
}

// Use placeholders when env vars are absent so `next build` prerender does not crash.
// Real values must be supplied at build time (see Dockerfile ARG/ENV for DigitalOcean).
export const supabase = createBrowserClient(
    supabaseUrl || 'https://build-placeholder.supabase.co',
    supabaseAnonKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.build-placeholder'
)
