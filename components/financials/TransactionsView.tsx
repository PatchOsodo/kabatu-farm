"use client";

import { useMemo, useState, useTransition } from "react";
import type { Enterprise, ExpenseCategory, FinancialTransaction, IncomeCategory, TransactionType } from "@/types/farm";
import { createTransactionAction } from "@/lib/actions/financials";
import { Button } from "@/components/ui/Button";

const INCOME_CATEGORIES: IncomeCategory[] = ["milk_sale", "livestock_sale", "egg_sale", "wool_sale", "crop_sale", "other"];
const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "feed",
  "medicine_vet",
  "seeds_planting_material",
  "fertilizer_chemicals",
  "labor_wages",
  "equipment_maintenance",
  "utilities",
  "transport",
  "other",
];

const ENTERPRISE_LABEL: Record<Enterprise, string> = {
  dairy: "Dairy Cattle",
  sheep: "Sheep",
  poultry: "Poultry",
  crops: "Crops & Fields",
};

interface TransactionsViewProps {
  transactions: FinancialTransaction[];
  canEdit: boolean;
}

export function TransactionsView({ transactions: initialTransactions, canEdit }: TransactionsViewProps) {
  const [localTransactions, setLocalTransactions] = useState<FinancialTransaction[]>([]);
  const [type, setType] = useState<TransactionType>("expense");
  const [enterprise, setEnterprise] = useState<Enterprise>("dairy");
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const transactions = useMemo(
    () =>
      [...localTransactions, ...initialTransactions].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
    [localTransactions, initialTransactions]
  );

  function categoriesFor(t: TransactionType) {
    return t === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  }

  function handleTypeChange(next: TransactionType) {
    setType(next);
    setCategory(categoriesFor(next)[0]);
  }

  function addTransaction() {
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0 || !description.trim()) return;
    setError(null);

    const optimistic: FinancialTransaction = {
      id: `local-${Date.now()}`,
      type,
      enterprise,
      category: category as ExpenseCategory | IncomeCategory,
      amount: { amount: amt, currency: "KES" as const },
      date,
      description: description.trim(),
      recordedBy: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setLocalTransactions((prev) => [optimistic, ...prev]);
    setAmount("");
    setDescription("");

    startTransition(async () => {
      const result = await createTransactionAction({
        type,
        enterprise,
        category: category as ExpenseCategory | IncomeCategory,
        amountValue: amt,
        date,
        description: optimistic.description,
      });
      if (!result.ok) {
        setError(result.error);
        setLocalTransactions((prev) => prev.filter((t) => t.id !== optimistic.id));
      }
    });
  }

  return (
    <div>
      {canEdit && (
        <section className="border border-line rounded p-5 mb-8 bg-parchment-100/40">
          <h2 className="font-display text-lg text-ink-900 mb-4">Log a transaction</h2>
          {error && <p className="text-sm text-danger mb-3">{error}</p>}
          <div className="flex flex-wrap gap-3 items-end">
            <Field label="Type">
              <select value={type} onChange={(e) => handleTypeChange(e.target.value as TransactionType)} className={inputCls}>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </Field>
            <Field label="Enterprise">
              <select value={enterprise} onChange={(e) => setEnterprise(e.target.value as Enterprise)} className={inputCls}>
                {(Object.keys(ENTERPRISE_LABEL) as Enterprise[]).map((e) => (
                  <option key={e} value={e}>
                    {ENTERPRISE_LABEL[e]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Category">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${inputCls} w-40`}>
                {categoriesFor(type).map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Amount (KES)">
              <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${inputCls} w-28`} />
            </Field>
            <Field label="Date">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Description">
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Milk sale — week 31"
                className={`${inputCls} w-52`}
              />
            </Field>
            <Button onClick={addTransaction} variant="primary" disabled={pending}>
              {pending ? "Saving…" : "Add entry"}
            </Button>
          </div>
        </section>
      )}

      <div className="border border-line rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-parchment-100/70 text-left text-ink-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-2.5 font-medium">Date</th>
              <th className="px-4 py-2.5 font-medium">Enterprise</th>
              <th className="px-4 py-2.5 font-medium">Category</th>
              <th className="px-4 py-2.5 font-medium">Description</th>
              <th className="px-4 py-2.5 font-medium text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className="border-t border-line hover:bg-parchment-100/40">
                <td className="px-4 py-2.5 font-mono-data text-xs text-ink-500">{t.date}</td>
                <td className="px-4 py-2.5 text-ink-700">{ENTERPRISE_LABEL[t.enterprise]}</td>
                <td className="px-4 py-2.5 text-ink-700 capitalize">{t.category.replace(/_/g, " ")}</td>
                <td className="px-4 py-2.5 text-ink-900">{t.description}</td>
                <td className={`px-4 py-2.5 text-right font-mono-data ${t.type === "income" ? "text-forest-700" : "text-danger"}`}>
                  {t.type === "income" ? "+" : "-"}
                  {t.amount.amount.toLocaleString("en-KE")}
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-500 text-sm">
                  No transactions logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const inputCls = "text-sm px-2.5 py-1.5 rounded border border-line bg-white focus:outline-none focus:border-gold-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-ink-500">
      {label}
      {children}
    </label>
  );
}
