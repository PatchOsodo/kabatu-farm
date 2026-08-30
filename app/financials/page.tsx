import { Topbar } from "@/components/layout/Topbar";
import { FinancialsTabs } from "@/components/financials/FinancialsTabs";
import { FinancialOverview } from "@/components/financials/FinancialOverview";
import { getTransactions } from "@/lib/data/financials";
import { getSessionUserName } from "@/lib/session";

export default async function FinancialsOverviewPage() {
  const [transactions, activeUserName] = await Promise.all([getTransactions(), getSessionUserName()]);

  return (
    <>
      <Topbar activeUserName={activeUserName} />
      <main className="flex-1 px-6 md:px-10 py-8">
        <FinancialsTabs />
        <FinancialOverview transactions={transactions} />
      </main>
    </>
  );
}
