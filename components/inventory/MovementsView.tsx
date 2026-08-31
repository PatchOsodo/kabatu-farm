"use client";

import { useMemo, useState, useTransition } from "react";
import type { InventoryItem, StockMovement, StockMovementType } from "@/types/farm";
import { createStockMovementAction } from "@/lib/actions/inventory";
import { Button } from "@/components/ui/Button";

const MOVEMENT_TYPES: StockMovementType[] = [
  "purchase_in",
"production_in",
"consumption_out",
"sale_out",
"spoilage_loss",
"adjustment",
];

const TYPE_LABEL: Record<StockMovementType, string> = {
  purchase_in: "Purchase (in)",
  production_in: "Production (in)",
  consumption_out: "Consumption (out)",
  sale_out: "Sale (out)",
  spoilage_loss: "Spoilage (out)",
  adjustment: "Adjustment",
};

const IS_INFLOW: Record<StockMovementType, boolean> = {
  purchase_in: true,
  production_in: true,
  consumption_out: false,
  sale_out: false,
  spoilage_loss: false,
  adjustment: true,
};

// Mirrors ENTERPRISE_SALE_CATEGORY in lib/data/inventory.ts — only
// dairy/poultry produce_output items get the optional sale-value field
// wired to Financials today. Kept here as a plain set (not imported)
// since it's UI-only gating (show/hide a field); the backend is the
// real source of truth for whether a transaction actually gets written.
const SALE_LINKED_ENTERPRISES = new Set(["dairy", "poultry"]);

interface MovementsViewProps {
  items: InventoryItem[];
  movements: StockMovement[];
  canEdit: boolean;
}

export function MovementsView({ items, movements: initialMovements, canEdit }: MovementsViewProps) {
  const [localMovements, setLocalMovements] = useState<StockMovement[]>([]);
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const [type, setType] = useState<StockMovementType>("purchase_in");
  const [quantity, setQuantity] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [saleValue, setSaleValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const movements = useMemo(
    () =>
    [...localMovements, ...initialMovements].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    ),
    [localMovements, initialMovements]
  );

  const itemName = useMemo(
    () => Object.fromEntries(items.map((i) => [i.id, `${i.name} (${i.unit})`])),
                           [items]
  );

  const selectedItem = items.find((i) => i.id === itemId);
  // Sale value only makes sense — and only reaches Financials — for a
  // sale_out movement against a produce_output item linked to dairy or
  // poultry (see lib/data/inventory.ts's ENTERPRISE_SALE_CATEGORY).
  // Hidden otherwise so nobody types a price that silently goes nowhere.
  const showSaleValue =
  type === "sale_out" &&
  selectedItem?.category === "produce_output" &&
  selectedItem?.linkedEnterprise !== undefined &&
  SALE_LINKED_ENTERPRISES.has(selectedItem.linkedEnterprise);

  function addMovement() {
    const qty = parseFloat(quantity);
    if (!itemId || !Number.isFinite(qty) || qty <= 0) return;
    setError(null);

    const saleValueAmount = showSaleValue && saleValue ? parseFloat(saleValue) : undefined;

    const optimistic: StockMovement = {
      id: `local-${Date.now()}`,
      itemId,
      type,
      quantity: qty,
      date,
      performedBy: "",
      notes: notes || undefined,
      createdAt: new Date().toISOString(),
    };
    setLocalMovements((prev) => [optimistic, ...prev]);
    setQuantity("");
    setNotes("");
    setSaleValue("");

    startTransition(async () => {
      const result = await createStockMovementAction({
        itemId,
        type,
        quantity: qty,
        date,
        notes: notes || undefined,
        saleValueAmount,
      });
      if (!result.ok) {
        setError(result.error);
        setLocalMovements((prev) => prev.filter((m) => m.id !== optimistic.id));
      }
    });
  }

  return (
    <div>
    {canEdit && items.length === 0 && (
      <div className="border border-line rounded p-5 mb-8 text-sm text-ink-500">
      No inventory items yet.{" "}
      <a href="/inventory" className="text-forest-700 underline">
      Add one on the Inventory page
      </a>{" "}
      before logging a movement.
      </div>
    )}
    {canEdit && items.length > 0 && (
      <section className="border border-line rounded p-5 mb-8 bg-parchment-100/40">
      <h2 className="font-display text-lg text-ink-900 mb-4">Log a stock movement</h2>
      {error && <p className="text-sm text-danger mb-3">{error}</p>}
      <div className="flex flex-wrap gap-3 items-end">
      <Field label="Item">
      <select value={itemId} onChange={(e) => setItemId(e.target.value)} className={`${inputCls} w-56`}>
      {items.map((i) => (
        <option key={i.id} value={i.id}>
        {i.name}
        </option>
      ))}
      </select>
      </Field>
      <Field label="Type">
      <select value={type} onChange={(e) => setType(e.target.value as StockMovementType)} className={inputCls}>
      {MOVEMENT_TYPES.map((t) => (
        <option key={t} value={t}>
        {TYPE_LABEL[t]}
        </option>
      ))}
      </select>
      </Field>
      <Field label="Quantity">
      <input type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={`${inputCls} w-24`} />
      </Field>
      <Field label="Date">
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
      </Field>
      {showSaleValue && (
        <Field label="Sale value (KES, optional)">
        <input
        type="number"
        min="0"
        value={saleValue}
        onChange={(e) => setSaleValue(e.target.value)}
        placeholder="e.g. 4200"
        className={`${inputCls} w-32`}
        />
        </Field>
      )}
      <Field label="Notes">
      <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="optional" className={`${inputCls} w-40`} />
      </Field>
      <Button onClick={addMovement} variant="primary" disabled={pending}>
      {pending ? "Saving…" : "Add entry"}
      </Button>
      </div>
      {showSaleValue && (
        <p className="text-xs text-ink-500 mt-2">
        Entering a sale value also records this as income under Financials — leave it blank to just log the stock movement.
        </p>
      )}
      </section>
    )}

    <div className="border border-line rounded overflow-hidden">
    <table className="w-full text-sm">
    <thead>
    <tr className="bg-parchment-100/70 text-left text-ink-500 text-xs uppercase tracking-wide">
    <th className="px-4 py-2.5 font-medium">Date</th>
    <th className="px-4 py-2.5 font-medium">Item</th>
    <th className="px-4 py-2.5 font-medium">Type</th>
    <th className="px-4 py-2.5 font-medium text-right">Quantity</th>
    <th className="px-4 py-2.5 font-medium">Notes</th>
    </tr>
    </thead>
    <tbody>
    {movements.map((m) => (
      <tr key={m.id} className="border-t border-line hover:bg-parchment-100/40">
      <td className="px-4 py-2.5 font-mono-data text-xs text-ink-500">{m.date}</td>
      <td className="px-4 py-2.5 text-ink-900">{itemName[m.itemId] ?? "—"}</td>
      <td className="px-4 py-2.5 text-ink-700">{TYPE_LABEL[m.type]}</td>
      <td
      className={`px-4 py-2.5 text-right font-mono-data ${
        IS_INFLOW[m.type] ? "text-forest-700" : "text-danger"
      }`}
      >
      {IS_INFLOW[m.type] ? "+" : "-"}
      {m.quantity}
      </td>
      <td className="px-4 py-2.5 text-ink-500 text-xs">{m.notes ?? "—"}</td>
      </tr>
    ))}
    {movements.length === 0 && (
      <tr>
      <td colSpan={5} className="px-4 py-8 text-center text-ink-500 text-sm">
      No stock movements logged yet.
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
