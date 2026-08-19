import { createClient } from '@supabase/supabase-js'

export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY가 필요합니다')
  }

  return createClient(url, anonKey, {
    auth: {
      flowType: 'implicit',
      autoRefreshToken: false,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
}
