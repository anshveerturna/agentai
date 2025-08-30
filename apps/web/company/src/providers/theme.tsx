"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type Theme = 'light' | 'dark'

type ThemeContextValue = {
  theme: Theme
  setTheme: (t: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function applyThemeClass(theme: Theme) {
  const root = document.documentElement
  // Temporarily suppress transitions to avoid flicker
  root.classList.add('disable-theme-transitions')
  if (theme === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
  // Remove suppression on next frames
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      root.classList.remove('disable-theme-transitions')
    })
  })
  // Safety timeout
  window.setTimeout(() => root.classList.remove('disable-theme-transitions'), 200)
}

export function ThemeProvider({ children, defaultTheme = 'dark' as Theme }: { children: React.ReactNode; defaultTheme?: Theme }) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme)
  // We do not track mounted state; apply theme on first client effect

  // Hydrate from storage or system preference on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('theme') as Theme | null
      if (stored === 'light' || stored === 'dark') {
        setThemeState(stored)
        applyThemeClass(stored)
        return
      }
      const system: Theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      setThemeState(system)
      applyThemeClass(system)
    } catch {
      // Fallback to default theme if storage unavailable
      applyThemeClass(defaultTheme)
    }
    // We only want to run this once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    try {
      localStorage.setItem('theme', t)
  // Keep SSR in sync for next request
  document.cookie = `theme=${t}; path=/; max-age=${60 * 60 * 24 * 365}`
    } catch {
      // ignore
    }
    applyThemeClass(t)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }, [theme, setTheme])

  const value = useMemo<ThemeContextValue>(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme])

  // Avoid rendering children until mounted to minimize flashes on first paint

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
