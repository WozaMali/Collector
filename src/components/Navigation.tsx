"use client";

import React, { memo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Package,
  Users,
  TrendingUp,
  Settings,
} from "lucide-react";

// Static to avoid re-creating on each render
const NAV_ITEMS = [
  { href: "/", icon: BarChart3, label: "Overview" },
  { href: "/pickups", icon: Package, label: "Pickups" },
  { href: "/users", icon: Users, label: "Users" },
  { href: "/analytics", icon: TrendingUp, label: "Analytics" },
  { href: "/settings", icon: Settings, label: "Settings" },
] as const;

function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-600 z-50 will-change-transform">
      <div className="flex items-center justify-around py-1 sm:py-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={`flex flex-col items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-lg transition-colors duration-100 ${
                isActive
                  ? "bg-orange-500 text-white"
                  : "text-gray-300 hover:text-white hover:bg-gray-700"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-5 w-5 sm:h-6 sm:w-6 mb-0.5" />
              <span className="text-[10px] sm:text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default memo(Navigation);
