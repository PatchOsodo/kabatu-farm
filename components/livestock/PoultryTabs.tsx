import { ModuleTabs } from "@/components/ui/Tabs";

const TABS = [
  { href: "/poultry", label: "Flocks" },
  { href: "/poultry/egg-log", label: "Egg Log" },
];

export function PoultryTabs() {
  return <ModuleTabs tabs={TABS} />;
}
