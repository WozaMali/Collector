'use client'

import { useEffect, useState } from 'react'

export default function SplashScreen() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Only render on client to avoid hydration mismatch
    setMounted(true)

    // Remove splash screen from DOM after animation completes (2.5s = 2s delay + 0.5s animation)
    // This prevents it from blocking interactions after it's hidden
    const timer = setTimeout(() => {
      const splash = document.getElementById('collector-splash-screen')
      if (splash) {
        splash.remove()
      }
    }, 2500)

    return () => clearTimeout(timer)
  }, [])

  // Don't render on server to avoid hydration mismatch
  // CSS animations can cause style attribute differences between server and client
  if (!mounted) {
    return null
  }

  return (
    <div id="collector-splash-screen" className="collector-splash-screen">
      <div className="collector-splash-content">
        <div className="collector-splash-logo">
          <img src="/Collector Icon.png" alt="Woza Mali Collector Logo" />
        </div>
        <h1 className="collector-splash-app-name">Woza Mali</h1>
        <p className="collector-splash-tagline">Collector App</p>
        <p className="collector-splash-subtitle">Recycling Collection Management</p>
        <div className="collector-splash-loading">
          <div className="collector-splash-spinner"></div>
        </div>
      </div>
    </div>
  )
}

