import { ModuleTabs } from "@/components/ui/Tabs";

const TABS = [
  { href: "/crops", label: "Plots" },
  { href: "/crops/cycles", label: "Crop Cycles" },
  { href: "/crops/log", label: "Inputs & Harvests" },
];

export function CropsTabs() {
  return <ModuleTabs tabs={TABS} />;
}
