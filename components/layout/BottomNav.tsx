"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS } from "@/lib/modules";
import { canAccessModule, canManageMilkLogs, canManagePoultry, canManageFinancials, canCreateTask } from "@/lib/authz";
import type { UserRole } from "@/types/farm";

interface BottomNavProps {
  /** undefined = guest (no session), same convention as Sidebar.tsx's role prop. */
  role: UserRole | undefined;
}

interface QuickAction {
  key: string;
  label: string;
  href: string;
  glyph: string;
}

/**
 * Mobile-only fixed bottom nav — groups the 8 flat NAV_ITEMS (see
 * lib/modules.ts) into 4 destinations, plus a central "+" quick-action
 * button. Uses the same canAccessModule() check as Sidebar.tsx so a
 * group disappears for a guest/role that can't reach any module inside
 * it, same as the existing desktop nav already does.
 *
 * The "+" opens a bottom sheet with the same four quick actions as the
 * dashboard's quick-actions row (app/page.tsx) — same permission
 * functions from lib/authz.ts, so the two stay in agreement rather than
 * risking two independently-maintained lists drifting apart. Each
 * action still links to a real page that enforces its own permission
 * server-side; this is UI convenience only, not a second access layer.
 */
export function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  const visibleGroups = NAV_GROUPS.filter(
    (g) => g.key === "home" || g.moduleKeys.some((m) => canAccessModule(role, m))
  );

  const quickActions: QuickAction[] = [
    canManageMilkLogs(role) && { key: "milk", label: "Log milk", href: "/dairy/milk-log/entry", glyph: "🥛" },
    canManagePoultry(role) && { key: "eggs", label: "Log eggs", href: "/poultry/egg-log", glyph: "🥚" },
    canManageFinancials(role) && { key: "expense", label: "Add expense", href: "/financials/transactions", glyph: "◈" },
    canCreateTask(role) && { key: "task", label: "Add task", href: "/tasks", glyph: "☑" },
  ].filter((a): a is QuickAction => Boolean(a));

  return (
    <>
    {sheetOpen && (
      <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
      <button
      aria-label="Close quick actions"
      onClick={() => setSheetOpen(false)}
      className="absolute inset-0 bg-ink-900/40"
      />
      <div className="relative bg-parchment-50 rounded-t-lg border-t border-line px-4 pt-4 pb-8">
      <div className="h-1 w-10 bg-line rounded-full mx-auto mb-4" aria-hidden />
      <p className="font-display text-base text-ink-900 mb-3">Quick actions</p>
      {quickActions.length === 0 ? (
        <p className="text-sm text-ink-500 pb-2">No quick actions available for your role.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
        {quickActions.map((a) => (
          <Link
          key={a.key}
          href={a.href}
          onClick={() => setSheetOpen(false)}
          className="flex items-center gap-2 border border-line rounded p-3 bg-white text-sm text-ink-900"
          >
          <span aria-hidden className="text-lg leading-none">
          {a.glyph}
          </span>
          {a.label}
          </Link>
        ))}
        </div>
      )}
      </div>
      </div>
    )}

    <nav
    className="md:hidden fixed bottom-0 inset-x-0 z-40 flex items-stretch border-t border-line bg-parchment-50"
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

    <div className="flex-1 flex items-center justify-center relative">
    <button
    onClick={() => setSheetOpen(true)}
    aria-label="Quick actions"
    className="absolute -top-5 h-12 w-12 rounded-full bg-forest-900 text-parchment-50 text-2xl leading-none flex items-center justify-center shadow-md"
    >
    +
    </button>
    </div>
    </nav>
    </>
  );
}
