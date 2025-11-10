import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/hooks/use-theme";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";
import PWAInstaller from "@/components/PWAInstaller";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={inter.className}>
        <ThemeProvider
          defaultTheme="system"
          storageKey="woza-mali-theme"
        >
          <AuthProvider>
            {children}
            <Toaster />
            <PWAInstaller />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}