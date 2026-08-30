"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS } from "@/lib/modules";
import { canAccessModule } from "@/lib/authz";
import type { UserRole } from "@/types/farm";

interface BottomNavProps {
  /** undefined = guest (no session), same convention as Sidebar.tsx's role prop. */
  role: UserRole | undefined;
}

/**
 * Mobile-only fixed bottom nav — groups the 8 flat NAV_ITEMS (see
 * lib/modules.ts) into 4 destinations. Additive alongside the existing
 * Topbar hamburger for now; Topbar's mobile nav panel still works
 * unchanged until a follow-up batch retires it. Uses the same
 * canAccessModule() check as Sidebar.tsx so a group disappears for a
 * guest/role that can't reach any module inside it, same as the
 * existing desktop nav already does.
 */
export function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname();

  const visibleGroups = NAV_GROUPS.filter(
    (g) => g.key === "home" || g.moduleKeys.some((m) => canAccessModule(role, m))
  );

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 flex border-t border-line bg-parchment-50"
      aria-label="Primary"
    >
      {visibleGroups.map((g) => {
        const active = g.key === "home" ? pathname === "/" : g.matchPrefixes.some((p) => pathname.startsWith(p));
        return (
          <Link
            key={g.key}
            href={g.href}
            aria-current={active ? "page" : undefined}
            className={[
              "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] transition-colors",
              active ? "text-forest-900 font-medium" : "text-ink-500",
            ].join(" ")}
          >
            <span aria-hidden className="text-lg leading-none">
              {g.glyph}
            </span>
            {g.label}
          </Link>
        );
      })}
    </nav>
  );
}
