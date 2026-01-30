'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export default function RouteTransition() {
  const [showSplash, setShowSplash] = useState(false)
  const pathname = usePathname()
  const [prevPathname, setPrevPathname] = useState(pathname)

  useEffect(() => {
    // Only show splash if pathname actually changed (not on initial load)
    if (pathname !== prevPathname && prevPathname !== null) {
      setShowSplash(true)
      
      // Hide splash after animation (1.5s - shorter than initial splash)
      const timer = setTimeout(() => {
        setShowSplash(false)
      }, 1500)
      
      return () => clearTimeout(timer)
    }
    
    setPrevPathname(pathname)
  }, [pathname, prevPathname])

  if (!showSplash) return null

  return (
    <div 
      id="collector-route-transition-splash" 
      className="collector-splash-screen"
      style={{ 
        animation: 'collectorFadeOut 0.5s ease-in-out 1s forwards',
        zIndex: 9998 
      }}
    >
      <div className="collector-splash-content">
        <div className="collector-splash-logo">
          <img src="/W Green.png.png" alt="Woza Mali Collector Logo" />
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

