import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Las credenciales viven en .env.local (NEXT_PUBLIC_*). Ver .env.example.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const supabaseConfigurado = Boolean(url && key)

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!client) {
    if (!url || !key) throw new Error('Falta configurar NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local')
    client = createClient(url, key)
  }
  return client
}
