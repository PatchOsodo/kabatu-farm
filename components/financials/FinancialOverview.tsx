import type { Enterprise, FinancialTransaction } from "@/types/farm";

const ENTERPRISES: Enterprise[] = ["dairy", "sheep", "poultry", "crops"];
const ENTERPRISE_LABEL: Record<Enterprise, string> = {
  dairy: "Dairy Cattle",
  sheep: "Sheep",
  poultry: "Poultry",
  crops: "Crops & Fields",
};

function money(amount: number) {
  return `KES ${amount.toLocaleString("en-KE")}`;
}

interface FinancialOverviewProps {
  transactions: FinancialTransaction[];
}

export function FinancialOverview({ transactions }: FinancialOverviewProps) {
  const byEnterprise = ENTERPRISES.map((e) => {
    const txns = transactions.filter((t) => t.enterprise === e);
    const income = txns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount.amount, 0);
    const expense = txns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount.amount, 0);
    return { enterprise: e, income, expense, net: income - expense };
  });

  const farmIncome = byEnterprise.reduce((s, e) => s + e.income, 0);
  const farmExpense = byEnterprise.reduce((s, e) => s + e.expense, 0);
  const farmNet = farmIncome - farmExpense;
  const maxBar = Math.max(...byEnterprise.flatMap((e) => [e.income, e.expense]), 1);

  return (
    <div>
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <SummaryCard label="Total Income" value={money(farmIncome)} tone="text-forest-700" />
        <SummaryCard label="Total Expense" value={money(farmExpense)} tone="text-danger" />
        <SummaryCard label="Net" value={`${farmNet >= 0 ? "+" : ""}${money(farmNet)}`} tone={farmNet >= 0 ? "text-forest-700" : "text-danger"} />
      </section>

      <section className="border border-line rounded p-5">
        <h2 className="font-display text-lg text-ink-900 mb-5">Income vs. Expense by Enterprise</h2>
        <div className="space-y-5">
          {byEnterprise.map((e) => (
            <div key={e.enterprise}>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-sm text-ink-900">{ENTERPRISE_LABEL[e.enterprise]}</span>
                <span className={`text-xs font-mono-data ${e.net >= 0 ? "text-forest-700" : "text-danger"}`}>
                  Net {e.net >= 0 ? "+" : ""}
                  {money(e.net)}
                </span>
              </div>
              <div className="space-y-1">
                <Bar label="Income" value={e.income} max={maxBar} className="bg-forest-700" />
                <Bar label="Expense" value={e.expense} max={maxBar} className="bg-danger/70" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="border border-line rounded p-4 bg-parchment-100/40">
      <p className="text-[11px] uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`font-display text-2xl mt-1 ${tone}`}>{value}</p>
    </div>
  );
}

function Bar({ label, value, max, className }: { label: string; value: number; max: number; className: string }) {
  const pct = Math.max(2, (value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-ink-500 w-14 shrink-0">{label}</span>
      <div className="flex-1 h-3 rounded-sm bg-parchment-200 overflow-hidden">
        <div className={`h-full rounded-sm ${className}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] font-mono-data text-ink-500 w-20 text-right">
        {value.toLocaleString("en-KE")}
      </span>
    </div>
  );
}
