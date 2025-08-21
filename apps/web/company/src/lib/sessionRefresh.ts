import { getSupabaseClient } from './supabase.client'

// Refresh session proactively every REFRESH_INTERVAL_MS (if near expiry) and on window focus.
// This helps rotate tokens and minimize use of stale access tokens.

const REFRESH_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes
const EXPIRY_THRESHOLD_SECONDS = 60 // Refresh if exp < now + 60s
let started = false
let timer: any

async function refreshIfExpiring() {
  try {
    const client = getSupabaseClient()
    const { data: { session } } = await client.auth.getSession()
    if (!session) return
    const exp = session.expires_at
    if (!exp) return
    const nowSeconds = Math.floor(Date.now() / 1000)
    if (exp - nowSeconds <= EXPIRY_THRESHOLD_SECONDS) {
      // Perform a token refresh; supabase-js handles using refresh token
      await client.auth.refreshSession()
    }
  } catch (e) {
    // Silently ignore; optional: add logging
  }
}

function schedule() {
  clearInterval(timer)
  timer = setInterval(refreshIfExpiring, REFRESH_INTERVAL_MS)
}

export function initSessionRefresh() {
  if (started) return
  started = true
  // Focus trigger
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', refreshIfExpiring, { passive: true })
  }
  schedule()
  // Initial check
  refreshIfExpiring()
}
