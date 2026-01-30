"use client";

import { Moon, Sun } from "lucide-react"
import { useTheme } from "@/hooks/use-theme"

export function ThemeIndicator() {
  const { theme } = useTheme()

  return (
    <div className="flex items-center gap-2">
      {theme === "light" ? (
        <Sun className="h-4 w-4 text-yellow-500" />
      ) : (
        <Moon className="h-4 w-4 text-blue-500" />
      )}
      <span className="text-sm capitalize">{theme}</span>
    </div>
  )
}
