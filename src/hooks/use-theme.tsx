"use client";

import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light' | 'system'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'woza-mali-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>('system')

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const root = window.document.documentElement

    root.classList.remove('light', 'dark')

    // Always follow system preference
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
      .matches
      ? 'dark'
      : 'light'

    root.classList.add(systemTheme)
  }, [])

  const value = {
    theme: 'system',
    setTheme: () => {
      // No-op - theme follows system preference
    },
  }

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider')

  return context
}
