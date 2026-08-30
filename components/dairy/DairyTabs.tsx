import { ModuleTabs } from "@/components/ui/Tabs";

const TABS = [
  { href: "/dairy", label: "Cattle" },
  { href: "/dairy/milk-log", label: "Milk Log" },
];

export function DairyTabs() {
  return <ModuleTabs tabs={TABS} />;
}
