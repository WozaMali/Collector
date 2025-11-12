'use client'

import { useEffect, useState } from 'react'

export default function SplashScreen() {
  const [show, setShow] = useState(true)

  useEffect(() => {
    // Hide splash screen after animation completes (2.5s = 2s delay + 0.5s animation)
    // Use state instead of manual DOM manipulation to avoid React errors
    const timer = setTimeout(() => {
      setShow(false)
    }, 2500)

    return () => clearTimeout(timer)
  }, [])

  // Don't render anything if hidden (React will handle cleanup)
  if (!show) {
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

