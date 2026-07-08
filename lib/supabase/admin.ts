import { createClient } from '@supabase/supabase-js'

function supabaseConfig() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  if (!url || !key) return null
  return { url, key }
}

let _adminClient: ReturnType<typeof createClient> | null = null

/** Shared Supabase admin client with leaselense schema access. */
export function createSupabaseAdminClient() {
  if (_adminClient) return _adminClient
  const config = supabaseConfig()
  if (!config) throw new Error('Missing Supabase admin environment variables.')
  _adminClient = createClient(config.url, config.key, {
    auth: { persistSession: false },
    global: {
      headers: {
        'Accept-Profile': 'leaselense',
        'Content-Profile': 'leaselense',
      },
    },
  })
  return _adminClient
}

/** Get the Supabase URL and service_role key for raw REST calls if needed. */
export function getSupabaseAdminConfig() {
  return supabaseConfig()
}
