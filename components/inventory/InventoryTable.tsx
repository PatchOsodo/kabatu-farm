"use client";

import { useMemo, useState, useTransition } from "react";
import type { ExpirationBatch, InventoryCategory, InventoryItem, Unit } from "@/types/farm";
import { createInventoryItemAction } from "@/lib/actions/inventory";
import { Button } from "@/components/ui/Button";

const CATEGORY_FILTERS: Array<InventoryCategory | "all"> = [
  "all",
  "feed",
  "seed",
  "medicine_vet",
  "chemical_agro",
  "equipment_consumable",
  "produce_output",
];

const EXPIRY_WARNING_DAYS = 30;

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

interface InventoryTableProps {
  items: InventoryItem[];
  batches: ExpirationBatch[];
  canEdit: boolean;
}

const CATEGORIES: InventoryCategory[] = ["feed", "seed", "medicine_vet", "chemical_agro", "equipment_consumable", "produce_output"];
const UNITS: Unit[] = ["kg", "g", "liters", "ml", "bags", "pieces", "doses"];
const inputCls = "text-sm px-2.5 py-1.5 rounded border border-line bg-white focus:outline-none focus:border-gold-500";

function AddItemForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<InventoryCategory>("feed");
  const [unit, setUnit] = useState<Unit>("kg");
  const [reorderThreshold, setReorderThreshold] = useState("");
  const [storageLocation, setStorageLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        + Add item
      </Button>
    );
  }

  function submit() {
    if (!name.trim()) {
      setError("Give the item a name.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createInventoryItemAction({
        name: name.trim(),
        category,
        unit,
        currentQuantity: 0,
        reorderThreshold: reorderThreshold ? parseFloat(reorderThreshold) : 0,
        storageLocation: storageLocation.trim() || undefined,
      });
      if (result.ok) {
        setName("");
        setReorderThreshold("");
        setStorageLocation("");
        setOpen(false);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <section className="border border-line rounded p-5 mb-6 bg-parchment-100/40">
      <h2 className="font-display text-base text-ink-900 mb-3">Add inventory item</h2>
      {error && <p className="text-sm text-danger mb-3">{error}</p>}
      <div className="flex flex-wrap gap-3 items-end">
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputCls} w-48`} />
        </Field>
        <Field label="Category">
          <select value={category} onChange={(e) => setCategory(e.target.value as InventoryCategory)} className={inputCls}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace("_", " ")}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Unit">
          <select value={unit} onChange={(e) => setUnit(e.target.value as Unit)} className={inputCls}>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Reorder at (optional)">
          <input
            type="number"
            min="0"
            value={reorderThreshold}
            onChange={(e) => setReorderThreshold(e.target.value)}
            className={`${inputCls} w-28`}
          />
        </Field>
        <Field label="Storage location (optional)">
          <input value={storageLocation} onChange={(e) => setStorageLocation(e.target.value)} className={`${inputCls} w-40`} />
        </Field>
        <Button type="button" onClick={submit} disabled={pending}>
          {pending ? "Saving…" : "Save item"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      <p className="text-xs text-ink-500 mt-2">Starts at 0 on hand — log a purchase on the Movements page to stock it.</p>
    </section>
  );
}

export function InventoryTable({ items, batches, canEdit }: InventoryTableProps) {
  const [category, setCategory] = useState<InventoryCategory | "all">("all");
  const [query, setQuery] = useState("");

  const soonestBatchByItem = useMemo(() => {
    const map: Record<string, { expirationDate: string; days: number }> = {};
    for (const b of batches) {
      const days = daysUntil(b.expirationDate);
      if (!map[b.itemId] || days < map[b.itemId].days) {
        map[b.itemId] = { expirationDate: b.expirationDate, days };
      }
    }
    return map;
  }, [batches]);

  const lowStockItems = items.filter((i) => i.reorderThreshold > 0 && i.currentQuantity <= i.reorderThreshold);
  const expiringItems = Object.entries(soonestBatchByItem).filter(([, v]) => v.days <= EXPIRY_WARNING_DAYS);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (category !== "all" && i.category !== category) return false;
      if (query.trim() && !i.name.toLowerCase().includes(query.trim().toLowerCase())) return false;
      return true;
    });
  }, [items, category, query]);

  return (
    <div>
      {canEdit && <AddItemForm />}

      {(lowStockItems.length > 0 || expiringItems.length > 0) && (
        <div className="mb-6 space-y-2">
          {lowStockItems.map((i) => (
            <div
              key={`low-${i.id}`}
              className="flex items-center justify-between text-sm px-4 py-2 rounded border border-danger/30 bg-danger/5 text-danger"
            >
              <span>
                Low stock: <strong>{i.name}</strong> — {i.currentQuantity} {i.unit} left (reorder at{" "}
                {i.reorderThreshold})
              </span>
            </div>
          ))}
          {expiringItems.map(([itemId, v]) => {
            const item = items.find((i) => i.id === itemId);
            if (!item) return null;
            return (
              <div
                key={`exp-${itemId}`}
                className="flex items-center justify-between text-sm px-4 py-2 rounded border border-gold-500/40 bg-gold-500/10 text-gold-600"
              >
                <span>
                  Expiring soon: <strong>{item.name}</strong> — {v.days <= 0 ? "expired" : `${v.days} days left`} (
                  {v.expirationDate})
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search item…"
          className="text-sm px-3 py-1.5 rounded border border-line bg-parchment-50 focus:outline-none focus:border-gold-500 w-56"
        />
        <div className="flex gap-1 flex-wrap">
          {CATEGORY_FILTERS.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={[
                "text-xs px-2.5 py-1 rounded-full border capitalize transition-colors",
                category === c
                  ? "bg-forest-900 text-parchment-50 border-forest-900"
                  : "border-line text-ink-500 hover:border-ink-300",
              ].join(" ")}
            >
              {c.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="border border-line rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-parchment-100/70 text-left text-ink-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-2.5 font-medium">Item</th>
              <th className="px-4 py-2.5 font-medium">Category</th>
              <th className="px-4 py-2.5 font-medium text-right">On hand</th>
              <th className="px-4 py-2.5 font-medium text-right">Reorder at</th>
              <th className="px-4 py-2.5 font-medium">Location</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => {
              const low = item.reorderThreshold > 0 && item.currentQuantity <= item.reorderThreshold;
              return (
                <tr key={item.id} className="border-t border-line hover:bg-parchment-100/40">
                  <td className="px-4 py-2.5 text-ink-900">{item.name}</td>
                  <td className="px-4 py-2.5 text-ink-700 capitalize">{item.category.replace("_", " ")}</td>
                  <td className={`px-4 py-2.5 text-right font-mono-data ${low ? "text-danger" : "text-ink-900"}`}>
                    {item.currentQuantity} {item.unit}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono-data text-ink-500">
                    {item.reorderThreshold > 0 ? `${item.reorderThreshold} ${item.unit}` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-ink-700">{item.storageLocation ?? "—"}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-500 text-sm">
                  No items match this search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-ink-500">
      {label}
      {children}
    </label>
  );
}
