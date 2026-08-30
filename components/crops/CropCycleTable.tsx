"use client";

import { useMemo, useState, useTransition } from "react";
import { ViewLink, Button } from "@/components/ui/Button";
import type { CropCycle, CropCycleStatus, CropLifeCycle, LandParcel } from "@/types/farm";
import { StatusPill } from "@/components/ui/StatusPill";
import { createCropCycleAction } from "@/lib/actions/crops";

const FILTERS: Array<CropLifeCycle | "all"> = ["all", "seasonal", "perennial"];
const inputCls = "text-sm px-2.5 py-1.5 rounded border border-line bg-white focus:outline-none focus:border-gold-500";

function AddCycleForm({ landParcels }: { landParcels: LandParcel[] }) {
  const [open, setOpen] = useState(false);
  const [plotId, setPlotId] = useState(landParcels[0]?.id ?? "");
  const [cropName, setCropName] = useState("");
  const [variety, setVariety] = useState("");
  const [lifeCycle, setLifeCycle] = useState<CropLifeCycle>("seasonal");
  const [status, setStatus] = useState<CropCycleStatus>("planned");
  const [areaPlantedAcres, setAreaPlantedAcres] = useState("");
  const [plantingDate, setPlantingDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (landParcels.length === 0) {
    return (
      <div className="border border-line rounded p-5 mb-6 text-sm text-ink-500">
        No plots yet.{" "}
        <a href="/crops" className="text-forest-700 underline">
          Add a plot on the Plots page
        </a>{" "}
        before starting a planting.
      </div>
    );
  }

  if (!open) {
    return (
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        + Add planting
      </Button>
    );
  }

  function submit() {
    const area = parseFloat(areaPlantedAcres);
    if (!cropName.trim() || !Number.isFinite(area) || area <= 0) {
      setError("Enter a crop name and a positive area planted.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createCropCycleAction({
        plotId,
        cropName: cropName.trim(),
        variety: variety.trim() || undefined,
        lifeCycle,
        status,
        areaPlantedAcres: area,
        plantingDate: plantingDate || undefined,
      });
      if (result.ok) {
        setCropName("");
        setVariety("");
        setAreaPlantedAcres("");
        setPlantingDate("");
        setOpen(false);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <section className="border border-line rounded p-5 mb-6 bg-parchment-100/40">
      <h2 className="font-display text-base text-ink-900 mb-3">Add planting</h2>
      {error && <p className="text-sm text-danger mb-3">{error}</p>}
      <div className="flex flex-wrap gap-3 items-end">
        <label className="flex flex-col gap-1 text-xs text-ink-500">
          Plot
          <select value={plotId} onChange={(e) => setPlotId(e.target.value)} className={inputCls}>
            {landParcels.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-500">
          Crop
          <input value={cropName} onChange={(e) => setCropName(e.target.value)} className={`${inputCls} w-36`} placeholder="e.g. Maize" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-500">
          Variety (optional)
          <input value={variety} onChange={(e) => setVariety(e.target.value)} className={`${inputCls} w-32`} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-500">
          Life cycle
          <select value={lifeCycle} onChange={(e) => setLifeCycle(e.target.value as CropLifeCycle)} className={inputCls}>
            <option value="seasonal">Seasonal</option>
            <option value="perennial">Perennial</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-500">
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as CropCycleStatus)} className={inputCls}>
            <option value="planned">Planned</option>
            <option value="land_prep">Land prep</option>
            <option value="planted">Planted</option>
            <option value="growing">Growing</option>
            <option value="flowering_fruiting">Flowering/fruiting</option>
            <option value="harvesting">Harvesting</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-500">
          Area (acres)
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={areaPlantedAcres}
            onChange={(e) => setAreaPlantedAcres(e.target.value)}
            className={`${inputCls} w-24`}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-ink-500">
          Planting date (optional)
          <input type="date" value={plantingDate} onChange={(e) => setPlantingDate(e.target.value)} className={inputCls} />
        </label>
        <Button type="button" onClick={submit} disabled={pending}>
          {pending ? "Saving…" : "Save planting"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </section>
  );
}

interface CropCycleTableProps {
  cropCycles: CropCycle[];
  landParcels: LandParcel[];
  canEdit: boolean;
}

export function CropCycleTable({ cropCycles, landParcels, canEdit }: CropCycleTableProps) {
  const [filter, setFilter] = useState<CropLifeCycle | "all">("all");

  const plotName = useMemo(() => Object.fromEntries(landParcels.map((p) => [p.id, p.name])), [landParcels]);

  const cycles = useMemo(() => {
    const list = filter === "all" ? cropCycles : cropCycles.filter((c) => c.lifeCycle === filter);
    return [...list].sort((a, b) => new Date(b.plantingDate ?? 0).getTime() - new Date(a.plantingDate ?? 0).getTime());
  }, [filter, cropCycles]);

  return (
    <div>
      {canEdit && <AddCycleForm landParcels={landParcels} />}

      <div className="flex gap-1 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={[
              "text-xs px-2.5 py-1 rounded-full border capitalize transition-colors",
              filter === f
                ? "bg-forest-900 text-parchment-50 border-forest-900"
                : "border-line text-ink-500 hover:border-ink-300",
            ].join(" ")}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="border border-line rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-parchment-100/70 text-left text-ink-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-2.5 font-medium">Crop</th>
              <th className="px-4 py-2.5 font-medium">Plot</th>
              <th className="px-4 py-2.5 font-medium">Cycle</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium text-right">Area</th>
              <th className="px-4 py-2.5 font-medium">Yield progress</th>
            </tr>
          </thead>
          <tbody>
            {cycles.map((c) => {
              const pct = c.forecastYieldKg
                ? Math.min(100, Math.round((c.actualYieldToDateKg / c.forecastYieldKg) * 100))
                : null;
              return (
                <tr key={c.id} className="border-t border-line hover:bg-parchment-100/40">
                  <td className="px-4 py-2.5">
                    <ViewLink href={`/crops/${c.plotId}`}>
                      {c.cropName}
                    </ViewLink>
                    {c.variety && <span className="text-ink-500 text-xs ml-1">({c.variety})</span>}
                  </td>
                  <td className="px-4 py-2.5 text-ink-700">{plotName[c.plotId]}</td>
                  <td className="px-4 py-2.5">
                    <StatusPill value={c.lifeCycle} />
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusPill value={c.status} />
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono-data text-ink-900">{c.areaPlantedAcres} ac</td>
                  <td className="px-4 py-2.5 w-40">
                    {pct !== null ? (
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-parchment-200 overflow-hidden">
                          <div className="h-full bg-gold-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-mono-data text-ink-500 w-9 text-right">{pct}%</span>
                      </div>
                    ) : (
                      <span className="text-ink-300 text-xs">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {cycles.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-500 text-sm">
                  No crop cycles in this category.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
