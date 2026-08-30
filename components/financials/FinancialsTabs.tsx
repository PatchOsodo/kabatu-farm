import { ModuleTabs } from "@/components/ui/Tabs";

const TABS = [
  { href: "/financials", label: "Overview" },
  { href: "/financials/transactions", label: "Transactions" },
];

export function FinancialsTabs() {
  return <ModuleTabs tabs={TABS} />;
}
