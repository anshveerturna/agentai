"use client"

import { useState, useEffect, useCallback } from "react"
import { Moon, Sun } from "lucide-react"

type Theme = 'light' | 'dark'

export function EnterpriseThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem('theme') as Theme
    if (stored && ['light', 'dark'].includes(stored)) {
      setTheme(stored)
      // Apply immediately to avoid flash
      if (stored === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    } else {
      // Default to system preference if no stored theme
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      setTheme(systemTheme)
      // Apply immediately to avoid flash
      if (systemTheme === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }, [])

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    const root = document.documentElement

    // Add class to disable transitions for a single frame burst
    root.classList.add('disable-theme-transitions')

    // Flip theme classes synchronously before next paint
    if (newTheme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    // Two rAFs to ensure styles applied, then remove suppression
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        root.classList.remove('disable-theme-transitions')
      })
    })

    // Safety fallback in case rAF chain misses
    window.setTimeout(() => root.classList.remove('disable-theme-transitions'), 200)

    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
  }, [theme])

  if (!mounted) {
    return null
  }

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center justify-center w-9 h-9 rounded-lg
                 bg-background hover:bg-accent
                 text-foreground theme-transition 
                 border border-border hover:border-border
                 shadow-sm hover:shadow-md"
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <span className="theme-transition-transform hover:scale-110">
        {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </span>
    </button>
  )
}
