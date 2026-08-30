"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/modules";
import { canAccessModule, type ModuleKey } from "@/lib/authz";
import type { UserRole } from "@/types/farm";

interface SidebarProps {
  /** undefined = guest (no session). Passed down from app/layout.tsx, which reads it server-side. */
  role: UserRole | undefined;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  // "dashboard" is always shown — "/" is public to everyone regardless of
  // role (see PUBLIC_EXACT_PATHS in proxy.ts), so it isn't run through
  // canAccessModule at all. Every other item is filtered by the same
  // check proxy.ts uses to gate the route itself, so a link is never
  // shown for a page the user would just get redirected away from.
  const visibleItems = NAV_ITEMS.filter(
    (item) => item.key === "dashboard" || canAccessModule(role, item.key as ModuleKey)
  );

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col md:shrink-0 bg-forest-900 text-parchment-50 min-h-screen">
      <div className="px-6 pt-8 pb-6 border-b border-forest-700">
        <p className="font-display text-2xl leading-none tracking-tight">Kabatu</p>
        <p className="font-display text-2xl leading-none tracking-tight text-gold-500">Farm</p>
        <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-parchment-200/60">
          Operations Ledger
        </p>
      </div>

      <nav className="flex-1 py-4">
        {visibleItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={[
                "flex items-center gap-3 px-6 py-2.5 text-sm border-l-2 transition-colors",
                active
                  ? "border-gold-500 bg-forest-800 text-parchment-50"
                  : "border-transparent text-parchment-200/70 hover:text-parchment-50 hover:bg-forest-800/60",
              ].join(" ")}
            >
              <span aria-hidden className="text-base leading-none">
                {item.glyph}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-6 py-5 border-t border-forest-700 text-[11px] text-parchment-200/50">
        Kabatu Farm · Nairobi County
      </div>
    </aside>
  );
}
