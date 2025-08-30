"use client"

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getSupabaseClient } from '../../lib/supabase.client'

interface AuthGateProps {
  children: React.ReactNode
  redirectTo?: string
  loadingFallback?: React.ReactNode
}

export function AuthGate({ children, redirectTo = '/login', loadingFallback = null }: AuthGateProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [status, setStatus] = useState<'checking' | 'authed' | 'anon' | 'error'>('checking')
  const [errMsg, setErrMsg] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    let cancelled = false
    const run = async () => {
      try {
        const supabase = getSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (cancelled) return
        if (!session) {
          setStatus('anon')
          const next = encodeURIComponent(pathname || '/')
          router.replace(`${redirectTo}?next=${next}`)
        } else {
          setStatus('authed')
        }
      } catch {
        if (!cancelled) {
          setErrMsg('Authentication check failed.')
          setStatus('error')
        }
      }
    }
    run()
    return () => { cancelled = true }
  }, [router, redirectTo, pathname])

  // Hide any loading fallback until after hydration to prevent SSR flash
  if (!mounted) return null
  if (status === 'checking') return <>{loadingFallback}</>
  if (status === 'error') return <div className="p-6 text-sm text-red-500">{errMsg}</div>
  if (status === 'anon') return <>{loadingFallback}</>
  return <>{children}</>
}
