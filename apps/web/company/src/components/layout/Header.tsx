"use client"
import { EnterpriseThemeToggle } from '../ui/theme-toggle'
import { getSupabaseClient } from '../../lib/supabase.client'
import { useRouter } from 'next/navigation'
import { useCallback, useState, useRef, useEffect } from 'react'

export function Header() {
  const router = useRouter()
  const handleLogoutAllDevices = useCallback(async () => {
    try {
      const supabase = getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      // Call global logout endpoint with access token if available
      await fetch('/api/auth/logout-all', {
        method: 'POST',
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
        credentials: 'include',
      })
      // Always clear local session
      await supabase.auth.signOut()
      router.replace('/login')
    } catch (e) {
      console.error('Global logout failed', e)
    }
  }, [router])

  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const toggle = () => setOpen(o => {
    const next = !o
    if (!next) {
      // remove focus style when closing
      buttonRef.current?.blur()
    }
    return next
  })
  const close = () => {
    setOpen(false)
    buttonRef.current?.blur()
  }
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) close()
    }
    if (open) document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
  <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-8 bg-sidebar supports-[backdrop-filter]:bg-sidebar/95 border-b border-sidebar-border shadow-lg backdrop-blur-sm theme-transition">
      <div className="flex items-center gap-4">
  <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-br from-[#1F6FEB] to-[#0969DA] bg-clip-text text-transparent theme-transition">Jinni</span>
        <span className="px-3 py-1 rounded-md bg-muted text-xs font-medium text-muted-foreground border border-border">
          Environment: Amity University (default)
        </span>
      </div>
      <div className="flex items-center gap-4">
        <EnterpriseThemeToggle />
  <button className="p-2 rounded-lg hover:bg-muted hover-lift group theme-transition">
          <svg className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
        <div className="relative" ref={menuRef}>
          <button
            ref={buttonRef}
            onClick={toggle}
            aria-haspopup="menu"
            aria-expanded={open}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1F6FEB] to-[#0969DA] p-0.5 hover-lift theme-transition-transform focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
              <span className="text-xs font-bold text-[#1F6FEB]">A</span>
            </div>
          </button>
          {open && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-44 rounded-lg border border-border bg-popover shadow-lg py-1 text-sm theme-transition z-50 backdrop-blur-sm"
            >
              <div className="px-3 py-2 border-b border-border text-xs uppercase tracking-wide text-muted-foreground">Account</div>
              <button
                onClick={() => { close(); handleLogoutAllDevices() }}
                role="menuitem"
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent hover:text-foreground theme-transition"
              >
                <span className="inline-block w-2 h-2 rounded-full bg-destructive/70" /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
