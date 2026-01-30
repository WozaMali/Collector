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
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 will-change-transform"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        background: "var(--app-surface)",
        borderTop: "1px solid var(--app-border)",
        boxShadow: "0 -4px 24px rgba(0,0,0,0.2)",
      }}
    >
      <div className="flex items-center justify-around gap-1 py-2 px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={`flex flex-col items-center justify-center min-w-[56px] h-14 rounded-xl transition-all duration-200 ${
                isActive
                  ? "bg-emerald-500/20 text-emerald-400 shadow-[0_0_0_1px_rgba(16,185,129,0.3)]"
                  : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className={`h-5 w-5 sm:h-6 sm:w-6 mb-0.5 ${isActive ? "text-emerald-400" : ""}`} />
              <span className="text-[10px] sm:text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default memo(Navigation);
