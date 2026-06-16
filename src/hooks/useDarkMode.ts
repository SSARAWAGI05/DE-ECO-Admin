import { useState, useEffect } from 'react'

export function useDarkMode() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const root = window.document.documentElement
    const initialColorValue = localStorage.getItem('theme')
    
    // Default to light mode ALWAYS, unless explicitly set to dark in localStorage
    const isDarkValue = initialColorValue === 'dark'
    
    setIsDark(isDarkValue)
    if (isDarkValue) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [])

  const toggleDarkMode = () => {
    const root = window.document.documentElement
    const newMode = !isDark
    if (newMode) {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
    setIsDark(newMode)
  }

  return { isDark, toggleDarkMode }
}
