"use client";

import { usePathname } from "next/navigation";
import { TabLink } from "./Button";

export interface TabItem {
  href: string;
  label: string;
}

/**
 * Every module (dairy, sheep, poultry, crops, financials, inventory) had
 * its own copy-pasted *Tabs.tsx doing exactly this. Consolidated so the
 * "is this clickable" styling only needs to be decided once, in TabLink.
 */
export function ModuleTabs({ tabs }: { tabs: TabItem[] }) {
  const pathname = usePathname();
  return (
    <div className="flex gap-1 border-b border-line mb-6">
      {tabs.map((tab) => (
        <TabLink key={tab.href} href={tab.href} active={pathname === tab.href}>
          {tab.label}
        </TabLink>
      ))}
    </div>
  );
}
