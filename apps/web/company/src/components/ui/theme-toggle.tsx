"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/providers/theme"

export function EnterpriseThemeToggle() {
  const { theme, toggleTheme } = useTheme()

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
