'use client'

import { useState, useEffect } from 'react'

export type Theme = 'dark' | 'light'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('qrm-theme') as Theme | null
    if (saved) apply(saved)
  }, [])

  function apply(t: Theme) {
    setTheme(t)
    localStorage.setItem('qrm-theme', t)
    if (t === 'light') {
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
    }
  }

  const toggle = () => apply(theme === 'dark' ? 'light' : 'dark')

  return { theme, toggle }
}
