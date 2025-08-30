"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseClient } from "../../../lib/supabase.client"
import { Loader2 } from "lucide-react"

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const client = getSupabaseClient()
        const { data, error } = await client.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          router.push('/login?error=auth_callback_failed')
          return
        }

        if (data?.session) {
          // Copy tokens to HttpOnly cookies for middleware
          try {
            await fetch('/api/auth/session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_in: data.session.expires_in,
              }),
              credentials: 'include',
            })
          } catch {
            // Non-fatal
          }
          // Success - redirect to dashboard
          router.push('/agents')
        } else {
          // No session - redirect to login
          router.push('/login')
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        router.push('/login?error=auth_callback_failed')
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
        <p className="text-slate-600 dark:text-slate-400">Completing sign in...</p>
      </div>
    </div>
  )
}
