"use client";

import { useMemo, useState, useTransition } from "react";
import type { CropCycle, HarvestRecord, InputApplication, InputApplicationType, InventoryItem, LandParcel } from "@/types/farm";
import { createCropLogEntryAction, type CropLogInput } from "@/lib/actions/crops";
import { Button } from "@/components/ui/Button";

type EntryKind = "input" | "harvest";
type InputUnit = InputApplication["unit"];

/**
 * InventoryItem.unit (Unit) and InputApplication.unit are different enums
 * — InventoryItem allows bags/pieces/doses/g, InputApplication only
 * kg/liters/grams/ml. Most map 1:1 ("g" → "grams" being the one rename);
 * bags/pieces/doses have no meaningful field-application unit, so those
 * fall back to manual selection rather than a silently wrong auto-fill.
 */
function mapInventoryUnitToInputUnit(unit: InventoryItem["unit"]): InputUnit | null {
  switch (unit) {
    case "kg":
      return "kg";
    case "g":
      return "grams";
    case "liters":
      return "liters";
    case "ml":
      return "ml";
    default:
      return null;
  }
}

interface UnifiedEntry {
  id: string;
  cropCycleId: string;
  kind: EntryKind;
  date: string;
  summary: string;
}

const INPUT_TYPES: InputApplicationType[] = ["fertilizer", "pesticide", "herbicide", "fungicide", "manure", "irrigation"];

function buildEntries(inputApplications: InputApplication[], harvestRecords: HarvestRecord[]): UnifiedEntry[] {
  const inputs: UnifiedEntry[] = inputApplications.map((i) => ({
    id: i.id,
    cropCycleId: i.cropCycleId,
    kind: "input",
    date: i.applicationDate,
    summary: `${i.productName} — ${i.quantityUsed} ${i.unit} (${i.type.replace("_", " ")})`,
  }));
  const harvests: UnifiedEntry[] = harvestRecords.map((h) => ({
    id: h.id,
    cropCycleId: h.cropCycleId,
    kind: "harvest",
    date: h.harvestDate,
    summary: `${h.quantityKg.toLocaleString("en-KE")} kg harvested${h.qualityGrade ? ` (${h.qualityGrade})` : ""}`,
  }));
  return [...inputs, ...harvests].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

const KIND_LABEL: Record<EntryKind, string> = { input: "Input applied", harvest: "Harvest" };
const KIND_TONE: Record<EntryKind, string> = {
  input: "text-clay-600 border-clay-600/30 bg-clay-600/5",
  harvest: "text-forest-700 border-forest-700/30 bg-forest-700/5",
};

interface CropsLogViewProps {
  cropCycles: CropCycle[];
  landParcels: LandParcel[];
  inputApplications: InputApplication[];
  harvestRecords: HarvestRecord[];
  inventoryItems: InventoryItem[];
  canEdit: boolean;
}

export function CropsLogView({ cropCycles, landParcels, inputApplications, harvestRecords, inventoryItems, canEdit }: CropsLogViewProps) {
  const [localEntries, setLocalEntries] = useState<UnifiedEntry[]>([]);
  const [kind, setKind] = useState<EntryKind>("input");
  const [cropCycleId, setCropCycleId] = useState(cropCycles[0]?.id ?? "");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [inputType, setInputType] = useState<InputApplicationType>("fertilizer");
  const [inventoryItemId, setInventoryItemId] = useState<string>("");
  const [manualUnit, setManualUnit] = useState<InputUnit>("kg");
  const [productName, setProductName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [qualityGrade, setQualityGrade] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedItem = inventoryItems.find((i) => i.id === inventoryItemId) ?? null;
  const autoFilledUnit = selectedItem ? mapInventoryUnitToInputUnit(selectedItem.unit) : null;
  // Locked to the inventory item's own unit when one's linked and maps
  // cleanly; otherwise falls back to manual selection.
  const effectiveUnit: InputUnit = autoFilledUnit ?? manualUnit;

  function handleInventoryItemChange(id: string) {
    setInventoryItemId(id);
    const item = inventoryItems.find((i) => i.id === id);
    if (item && !item.name.trim()) return;
    if (item) setProductName(item.name);
  }

  const entries = useMemo(
    () => [...localEntries, ...buildEntries(inputApplications, harvestRecords)],
    [localEntries, inputApplications, harvestRecords]
  );

  const cycleLabel = useMemo(() => {
    const plotName = Object.fromEntries(landParcels.map((p) => [p.id, p.name]));
    return Object.fromEntries(cropCycles.map((c) => [c.id, `${c.cropName} @ ${plotName[c.plotId]}`]));
  }, [cropCycles, landParcels]);

  function addEntry() {
    const qty = parseFloat(quantity);
    if (!cropCycleId || !Number.isFinite(qty)) return;
    setError(null);

    const summary =
      kind === "input"
        ? `${productName || "Input"} — ${qty} ${effectiveUnit} (${inputType.replace("_", " ")})`
        : `${qty.toLocaleString("en-KE")} kg harvested${qualityGrade ? ` (${qualityGrade})` : ""}`;

    const optimistic: UnifiedEntry = { id: `local-${Date.now()}`, cropCycleId, kind, date, summary };
    setLocalEntries((prev) => [optimistic, ...prev]);

    const input: CropLogInput =
      kind === "input"
        ? {
            kind: "input",
            cropCycleId,
            date,
            inputType,
            productName,
            quantity: qty,
            unit: effectiveUnit,
            inventoryItemId: inventoryItemId || undefined,
          }
        : { kind: "harvest", cropCycleId, date, quantity: qty, qualityGrade: qualityGrade || undefined };

    setProductName("");
    setQuantity("");
    setQualityGrade("");
    setInventoryItemId("");

    startTransition(async () => {
      const result = await createCropLogEntryAction(input);
      if (!result.ok) {
        setError(result.error);
        setLocalEntries((prev) => prev.filter((e) => e.id !== optimistic.id));
      }
    });
  }

  return (
    <div>
      {canEdit && (
        <section className="border border-line rounded p-5 mb-8 bg-parchment-100/40">
          <h2 className="font-display text-lg text-ink-900 mb-4">Log a new entry</h2>
          {error && <p className="text-sm text-danger mb-3">{error}</p>}
          <div className="flex flex-wrap gap-3 items-end">
            <Field label="Type">
              <select value={kind} onChange={(e) => setKind(e.target.value as EntryKind)} className={inputCls}>
                <option value="input">Input applied</option>
                <option value="harvest">Harvest</option>
              </select>
            </Field>
            <Field label="Crop cycle">
              <select value={cropCycleId} onChange={(e) => setCropCycleId(e.target.value)} className={`${inputCls} w-56`}>
                {cropCycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {cycleLabel[c.id]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </Field>

            {kind === "input" ? (
              <>
                <Field label="Input type">
                  <select value={inputType} onChange={(e) => setInputType(e.target.value as InputApplicationType)} className={inputCls}>
                    {INPUT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="From inventory (optional)">
                  <select
                    value={inventoryItemId}
                    onChange={(e) => handleInventoryItemChange(e.target.value)}
                    className={`${inputCls} w-44`}
                  >
                    <option value="">— none, enter manually —</option>
                    {inventoryItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Product">
                  <input
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g. DAP"
                    className={`${inputCls} w-32`}
                  />
                </Field>
                <Field label="Quantity">
                  <input type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={`${inputCls} w-20`} />
                </Field>
                <Field label="Unit">
                  {autoFilledUnit ? (
                    <div className={`${inputCls} w-24 bg-parchment-100/70 text-ink-500`} title="Locked to the linked inventory item's own unit">
                      {autoFilledUnit}
                    </div>
                  ) : (
                    <select value={manualUnit} onChange={(e) => setManualUnit(e.target.value as InputUnit)} className={`${inputCls} w-24`}>
                      <option value="kg">kg</option>
                      <option value="liters">liters</option>
                      <option value="grams">grams</option>
                      <option value="ml">ml</option>
                    </select>
                  )}
                </Field>
              </>
            ) : (
              <>
                <Field label="Quantity (kg)">
                  <input type="number" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={`${inputCls} w-28`} />
                </Field>
                <Field label="Quality grade">
                  <input
                    value={qualityGrade}
                    onChange={(e) => setQualityGrade(e.target.value)}
                    placeholder="e.g. Grade 1"
                    className={`${inputCls} w-32`}
                  />
                </Field>
              </>
            )}

            <Button onClick={addEntry} variant="primary" disabled={pending}>
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
              <th className="px-4 py-2.5 font-medium">Crop cycle</th>
              <th className="px-4 py-2.5 font-medium">Type</th>
              <th className="px-4 py-2.5 font-medium">Detail</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-line hover:bg-parchment-100/40">
                <td className="px-4 py-2.5 font-mono-data text-xs text-ink-500">{e.date}</td>
                <td className="px-4 py-2.5 text-ink-900">{cycleLabel[e.cropCycleId] ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full border font-mono-data ${KIND_TONE[e.kind]}`}>
                    {KIND_LABEL[e.kind]}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-ink-700">{e.summary}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-ink-500 text-sm">
                  No entries logged yet.
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
