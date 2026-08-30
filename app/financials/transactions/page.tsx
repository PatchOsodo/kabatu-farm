import { Topbar } from "@/components/layout/Topbar";
import { FinancialsTabs } from "@/components/financials/FinancialsTabs";
import { TransactionsView } from "@/components/financials/TransactionsView";
import { getTransactions, getCurrentUserRole } from "@/lib/data/financials";
import { canManageFinancials } from "@/lib/authz";
import { getSessionUserName } from "@/lib/session";

export default async function TransactionsPage() {
  const [transactions, role, activeUserName] = await Promise.all([
    getTransactions(),
    getCurrentUserRole(),
    getSessionUserName(),
  ]);

  return (
    <>
      <Topbar activeUserName={activeUserName} />
      <main className="flex-1 px-6 md:px-10 py-8">
        <FinancialsTabs />
        <TransactionsView transactions={transactions} canEdit={canManageFinancials(role)} />
      </main>
    </>
  );
}
