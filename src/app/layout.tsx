import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { getPublicSupabaseEnv } from "@/lib/env.server";
import { ThemeProvider } from "@/hooks/use-theme";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";
import PWAInstaller from "@/components/PWAInstaller";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import SplashScreen from "@/components/SplashScreen";
import RouteTransition from "@/components/RouteTransition";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans-app",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Collector",
  description: "Recycling collection management system for collectors",
  icons: {
    icon: [
      { url: "/Collector Icon.png", sizes: "32x32", type: "image/png" },
      { url: "/Collector Icon.png", sizes: "192x192", type: "image/png" }
    ],
    shortcut: "/Collector Icon.png",
    apple: "/Collector Icon.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__SUPABASE_ENV__=${JSON.stringify(getPublicSupabaseEnv())};`,
          }}
        />
        <script dangerouslySetInnerHTML={{
          __html: `
            // Service worker cleanup (skip on native Capacitor)
            (function(){
              try {
                var isNative = false;
                try {
                  if (typeof window !== 'undefined' && window.Capacitor) {
                    var mod = { Capacitor: window.Capacitor };
                    if (mod.Capacitor && typeof mod.Capacitor.isNativePlatform === 'function') {
                      isNative = mod.Capacitor.isNativePlatform() === true;
                    }
                  }
                } catch (e) {}
                if (isNative) return;
                if (typeof window !== 'undefined' && window.isSecureContext && 'serviceWorker' in navigator) {
                  (async function(){
                    try {
                      var regs = await navigator.serviceWorker.getRegistrations();
                      // Only unregister if there are conflicts - let PWAInstaller handle registration
                      // for (var i=0;i<regs.length;i++){ await regs[i].unregister(); }
                      var names = await caches.keys();
                      for (var j=0;j<names.length;j++){ await caches.delete(names[j]); }
                    } catch (err) { console.error(err); }
                  })();
                }
              } catch (err) { console.error(err); }
            })();
          `
        }} />
      </head>
      <body className={plusJakarta.className}>
        <SplashScreen />
        <ThemeProvider
          defaultTheme="system"
          storageKey="woza-mali-theme"
        >
          <AuthProvider>
            <RouteTransition />
            {children}
            <Toaster />
            <PWAInstaller />
            <PWAInstallPrompt />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}