import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _supabase: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
	if (_supabase) return _supabase
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
	const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
	if (!supabaseUrl || !supabaseAnonKey) {
		throw new Error('Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
	}
	_supabase = createClient(supabaseUrl, supabaseAnonKey)
	return _supabase
}

// Backwards compatibility export (optional). Prefer getSupabaseClient().
export const supabase = (() => {
	try { return getSupabaseClient() } catch { return undefined as unknown as SupabaseClient }
})()