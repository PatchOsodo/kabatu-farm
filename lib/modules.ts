import type { Enterprise } from "@/types/farm";
import type { ModuleKey } from "@/lib/authz";

export interface ModuleNavItem {
  key: Enterprise | "dashboard" | "inventory" | "financials" | "tasks";
  label: string;
  href: string;
  /** short glyph used in the sidebar in place of an icon library — keeps Phase 1 dependency-free */
  glyph: string;
}

export const NAV_ITEMS: ModuleNavItem[] = [
  { key: "dashboard", label: "Overview", href: "/", glyph: "◆" },
  { key: "dairy", label: "Dairy Cattle", href: "/dairy", glyph: "🐄" },
  { key: "sheep", label: "Sheep", href: "/sheep", glyph: "🐑" },
  { key: "poultry", label: "Poultry", href: "/poultry", glyph: "🐔" },
  { key: "crops", label: "Crops & Fields", href: "/crops", glyph: "🌾" },
  { key: "inventory", label: "Inventory", href: "/inventory", glyph: "▤" },
  { key: "tasks", label: "Tasks", href: "/tasks", glyph: "☑" },
  { key: "financials", label: "Financials", href: "/financials", glyph: "◈" },
];

export const ENTERPRISE_LABEL: Record<Enterprise, string> = {
  dairy: "Dairy Cattle",
  sheep: "Sheep",
  poultry: "Poultry",
  crops: "Crops & Fields",
};

// ─────────────────────────────────────────────────────────────
// MOBILE BOTTOM NAV — grouped view of the same NAV_ITEMS above.
// Purely a presentation grouping; does not replace NAV_ITEMS or
// change Sidebar.tsx's desktop behavior. Grouping intentionally
// lines up with the guest-readable vs role-gated split already
// defined in lib/authz.ts (GUEST_READABLE_MODULES vs
// MODULE_ROLE_REQUIREMENTS) — "Farm" is the public tier, "Ops" and
// "Money" are the authenticated tier.
//
// "Farm" now lands on /farm, a 4-tile picker page (see app/farm/page.tsx)
// rather than defaulting into /dairy.
// ─────────────────────────────────────────────────────────────

export interface NavGroupItem {
  key: "home" | "farm" | "ops" | "money";
  label: string;
  href: string;
  glyph: string;
  /** Group is shown if the person can access at least one of these modules. Empty array = always shown (home). */
  moduleKeys: ModuleKey[];
  /** Path prefixes used to mark this group as active. "home" is handled as an exact match on "/" in BottomNav, not via this list, since every path starts with "/". */
  matchPrefixes: string[];
}

export const NAV_GROUPS: NavGroupItem[] = [
  { key: "home", label: "Home", href: "/", glyph: "◆", moduleKeys: [], matchPrefixes: [] },
  {
    key: "farm",
    label: "Farm",
    href: "/farm",
    glyph: "🌾",
    moduleKeys: ["dairy", "sheep", "poultry", "crops"],
    matchPrefixes: ["/farm", "/dairy", "/sheep", "/poultry", "/crops"],
  },
  {
    key: "ops",
    label: "Ops",
    href: "/tasks",
    glyph: "☑",
    moduleKeys: ["tasks", "inventory"],
    matchPrefixes: ["/tasks", "/inventory"],
  },
  {
    key: "money",
    label: "Money",
    href: "/financials",
    glyph: "◈",
    moduleKeys: ["financials"],
    matchPrefixes: ["/financials"],
  },
];
