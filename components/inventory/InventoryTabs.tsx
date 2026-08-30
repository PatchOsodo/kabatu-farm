import { ModuleTabs } from "@/components/ui/Tabs";

const TABS = [
  { href: "/inventory", label: "Stock" },
  { href: "/inventory/movements", label: "Movements" },
];

export function InventoryTabs() {
  return <ModuleTabs tabs={TABS} />;
}
