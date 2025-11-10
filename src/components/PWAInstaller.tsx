'use client';

import { useEffect, useState } from 'react';

export default function PWAInstaller() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Register service worker
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered: ', registration);
          
          // If there's already a waiting worker, an update is ready
          if (registration.waiting && navigator.serviceWorker.controller) {
            setUpdateAvailable(true);
          }

          // Check for updates - only show when installed and it's an update (not first install)
          registration.addEventListener('updatefound', () => {
            console.log('Service worker update found');
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setUpdateAvailable(true);
                }
              });
            }
          });
          
          // Handle service worker updates
          let hasReloaded = false;
          registration.addEventListener('controllerchange', () => {
            if (hasReloaded) return;
            hasReloaded = true;
            console.log('Service worker controller changed');
            window.location.reload();
          });
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });

      // Listen for service worker messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SW_UPDATE_AVAILABLE') {
          setUpdateAvailable(true);
        }
      });

      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          console.log('Notification permission:', permission);
        });
      }
    }
  }, []);

  // Handle update installation
  const handleUpdate = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration && registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          // Hide the banner while we switch
          setUpdateAvailable(false);
        }
      });
    }
  };

  return (
    <>
      {updateAvailable && (
        <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white p-4 rounded-lg shadow-lg max-w-sm">
          <div className="flex items-center space-x-3">
            <div className="flex-1">
              <h3 className="font-semibold">Update Available</h3>
              <p className="text-sm opacity-90">A new version is ready to install.</p>
            </div>
            <button
              onClick={handleUpdate}
              className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              Update
            </button>
          </div>
        </div>
      )}
    </>
  );
}
