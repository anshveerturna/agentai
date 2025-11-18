import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let _supabase: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
	if (_supabase) return _supabase
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
	const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
	if (!supabaseUrl || !supabaseAnonKey) {
		throw new Error('Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY')
	}
	// Developer-friendly validation: detect placeholder or obviously invalid anon key early.
	if (supabaseAnonKey.includes('<your anon key>')) {
		throw new Error('Supabase anon key placeholder detected. Replace <your anon key> in apps/web/company/.env.local with the real NEXT_PUBLIC_SUPABASE_ANON_KEY from your Supabase project settings.')
	}
	// Basic length / structure heuristic (JWT-like anon keys are usually long base64 segments with dots)
	if (supabaseAnonKey.length < 40 || !supabaseAnonKey.includes('.')) {
		console.warn('[supabase] Anon key appears shorter than expected – double check you copied the full public anon key.')
	}
	_supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
	return _supabase
}

// Backwards compatibility export (optional). Prefer getSupabaseClient().
export const supabase = (() => {
	try { return getSupabaseClient() } catch { return undefined as unknown as SupabaseClient }
})()