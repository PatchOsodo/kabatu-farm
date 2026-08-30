"use client";

import { useMemo, useState, useTransition } from "react";
import type { LambingRecord, MeatOffFlockRecord, SheepFlock, WoolHarvestRecord } from "@/types/farm";
import { createSheepEventAction, type SheepEventInput } from "@/lib/actions/sheep";
import { Button } from "@/components/ui/Button";

type EventKind = "lambing" | "wool" | "meat";

interface UnifiedEvent {
  id: string;
  flockId: string;
  kind: EventKind;
  date: string;
  summary: string;
  value?: number;
}

function buildEvents(
  lambingRecords: LambingRecord[],
  woolRecords: WoolHarvestRecord[],
  meatRecords: MeatOffFlockRecord[]
): UnifiedEvent[] {
  const lambing: UnifiedEvent[] = lambingRecords.map((l) => ({
    id: l.id,
    flockId: l.flockId,
    kind: "lambing",
    date: l.lambingDate,
    summary: `${l.lambsBornAlive} born alive${l.lambsStillborn ? `, ${l.lambsStillborn} stillborn` : ""}`,
  }));
  const wool: UnifiedEvent[] = woolRecords.map((w) => ({
    id: w.id,
    flockId: w.flockId,
    kind: "wool",
    date: w.shearingDate,
    summary: `${w.sheepShorn} sheared · ${w.totalWeightKg} kg`,
    value: w.saleValue?.amount,
  }));
  const meat: UnifiedEvent[] = meatRecords.map((m) => ({
    id: m.id,
    flockId: m.flockId,
    kind: "meat",
    date: m.date,
    summary: `${m.animalsSold} sold${m.totalLiveWeightKg ? ` · ${m.totalLiveWeightKg} kg` : ""}`,
    value: m.saleValue?.amount,
  }));
  return [...lambing, ...wool, ...meat].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

const KIND_LABEL: Record<EventKind, string> = { lambing: "Lambing", wool: "Wool", meat: "Meat sale" };
const KIND_TONE: Record<EventKind, string> = {
  lambing: "text-forest-700 border-forest-700/30 bg-forest-700/5",
  wool: "text-gold-600 border-gold-500/40 bg-gold-500/10",
  meat: "text-clay-600 border-clay-600/30 bg-clay-600/5",
};

interface SheepEventsViewProps {
  flocks: SheepFlock[];
  lambingRecords: LambingRecord[];
  woolRecords: WoolHarvestRecord[];
  meatRecords: MeatOffFlockRecord[];
  canEdit: boolean;
}

export function SheepEventsView({ flocks, lambingRecords, woolRecords, meatRecords, canEdit }: SheepEventsViewProps) {
  const [localEvents, setLocalEvents] = useState<UnifiedEvent[]>([]);
  const [kind, setKind] = useState<EventKind>("lambing");
  const [flockId, setFlockId] = useState(flocks[0]?.id ?? "");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [a, setA] = useState(""); // born alive / sheep shorn / animals sold
  const [b, setB] = useState(""); // stillborn / total weight kg
  const [saleValue, setSaleValue] = useState(""); // wool/meat only
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const events = useMemo(
    () => [...localEvents, ...buildEvents(lambingRecords, woolRecords, meatRecords)],
    [localEvents, lambingRecords, woolRecords, meatRecords]
  );

  const flockName = useMemo(() => Object.fromEntries(flocks.map((f) => [f.id, f.flockName])), [flocks]);

  function fieldsFor(k: EventKind) {
    if (k === "lambing") return { aLabel: "Lambs born alive", bLabel: "Stillborn", showSale: false };
    if (k === "wool") return { aLabel: "Sheep shorn", bLabel: "Total weight (kg)", showSale: true };
    return { aLabel: "Animals sold", bLabel: null, showSale: true };
  }
  const fields = fieldsFor(kind);

  function submit() {
    if (!flockId) return;
    setError(null);

    let input: SheepEventInput;
    if (kind === "lambing") {
      const bornAlive = parseFloat(a);
      if (!Number.isFinite(bornAlive)) return;
      input = {
        kind: "lambing",
        flockId,
        date,
        lambsBornAlive: bornAlive,
        lambsStillborn: parseFloat(b) || 0,
      };
    } else if (kind === "wool") {
      const shorn = parseFloat(a);
      const weight = parseFloat(b);
      if (!Number.isFinite(shorn) || !Number.isFinite(weight)) return;
      input = {
        kind: "wool",
        flockId,
        date,
        sheepShorn: shorn,
        totalWeightKg: weight,
        saleValueAmount: saleValue ? parseFloat(saleValue) : undefined,
      };
    } else {
      const sold = parseFloat(a);
      if (!Number.isFinite(sold)) return;
      input = {
        kind: "meat",
        flockId,
        date,
        animalsSold: sold,
        saleValueAmount: saleValue ? parseFloat(saleValue) : undefined,
      };
    }

    const optimistic: UnifiedEvent = {
      id: `local-${Date.now()}`,
      flockId,
      kind,
      date,
      summary:
        kind === "lambing"
          ? `${a} born alive${b ? `, ${b} stillborn` : ""}`
          : kind === "wool"
            ? `${a} sheared · ${b} kg`
            : `${a} sold`,
      value: saleValue ? parseFloat(saleValue) : undefined,
    };
    setLocalEvents((prev) => [optimistic, ...prev]);
    setA("");
    setB("");
    setSaleValue("");

    startTransition(async () => {
      const result = await createSheepEventAction(input);
      if (!result.ok) {
        setError(result.error);
        setLocalEvents((prev) => prev.filter((e) => e.id !== optimistic.id));
      }
    });
  }

  return (
    <div>
      {canEdit && (
        <section className="border border-line rounded p-5 mb-8 bg-parchment-100/40">
          <h2 className="font-display text-lg text-ink-900 mb-4">Log a new event</h2>
          {error && <p className="text-sm text-danger mb-3">{error}</p>}
          <div className="flex flex-wrap gap-3 items-end">
            <Field label="Type">
              <select value={kind} onChange={(e) => setKind(e.target.value as EventKind)} className={inputCls}>
                <option value="lambing">Lambing</option>
                <option value="wool">Wool harvest</option>
                <option value="meat">Meat sale</option>
              </select>
            </Field>
            <Field label="Flock">
              <select value={flockId} onChange={(e) => setFlockId(e.target.value)} className={inputCls}>
                {flocks.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.flockName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </Field>
            <Field label={fields.aLabel}>
              <input
                type="number"
                min="0"
                value={a}
                onChange={(e) => setA(e.target.value)}
                className={`${inputCls} w-28`}
              />
            </Field>
            {fields.bLabel && (
              <Field label={fields.bLabel}>
                <input
                  type="number"
                  min="0"
                  value={b}
                  onChange={(e) => setB(e.target.value)}
                  className={`${inputCls} w-28`}
                />
              </Field>
            )}
            {fields.showSale && (
              <Field label="Sale value (KES)">
                <input
                  type="number"
                  min="0"
                  value={saleValue}
                  onChange={(e) => setSaleValue(e.target.value)}
                  className={`${inputCls} w-28`}
                />
              </Field>
            )}
            <Button onClick={submit} variant="primary" disabled={pending}>
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
              <th className="px-4 py-2.5 font-medium">Flock</th>
              <th className="px-4 py-2.5 font-medium">Type</th>
              <th className="px-4 py-2.5 font-medium">Detail</th>
              <th className="px-4 py-2.5 font-medium text-right">Value</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-t border-line hover:bg-parchment-100/40">
                <td className="px-4 py-2.5 font-mono-data text-xs text-ink-500">{e.date}</td>
                <td className="px-4 py-2.5 text-ink-900">{flockName[e.flockId]}</td>
                <td className="px-4 py-2.5">
                  <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full border font-mono-data ${KIND_TONE[e.kind]}`}>
                    {KIND_LABEL[e.kind]}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-ink-700">{e.summary}</td>
                <td className="px-4 py-2.5 text-right font-mono-data text-ink-900">
                  {e.value ? `KES ${e.value.toLocaleString("en-KE")}` : "—"}
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-500 text-sm">
                  No events logged yet.
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
