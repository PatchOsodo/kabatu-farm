import { ModuleTabs } from "@/components/ui/Tabs";

const TABS = [
  { href: "/sheep", label: "Flocks" },
  { href: "/sheep/events", label: "Lambing & Sales" },
];

export function SheepTabs() {
  return <ModuleTabs tabs={TABS} />;
}
