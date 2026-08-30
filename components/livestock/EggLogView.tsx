"use client";

import { useMemo, useState, useTransition } from "react";
import { ViewLink } from "@/components/ui/Button";
import type { EggCollectionLog, HealthRecord, PoultryFlock } from "@/types/farm";
import { upsertEggLogAction } from "@/lib/actions/poultry";
import { getActiveQuarantine } from "@/lib/quarantine";
import { EditableMilkCell as EditableCell } from "@/components/dairy/EditableMilkCell";

type Field = "collected" | "broken";

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function formatLabel(iso: string) {
  const today = toISODate(new Date());
  const yesterday = toISODate(new Date(Date.now() - 86400000));
  if (iso === today) return "Today";
  if (iso === yesterday) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" });
}

interface EggLogViewProps {
  flocks: PoultryFlock[];
  eggLogs: EggCollectionLog[];
  healthRecords: HealthRecord[];
  canEdit: boolean;
}

export function EggLogView({ flocks, eggLogs, healthRecords, canEdit }: EggLogViewProps) {
  const [date, setDate] = useState(() => toISODate(new Date()));
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const flocksWithEggs = useMemo(
    () => flocks.filter((f) => eggLogs.some((e) => e.flockId === f.id)),
    [flocks, eggLogs]
  );

  // Same convention as sheep/poultry detail pages: flock-level quarantine.
  // Eggs from a quarantined flock still get logged (birds still lay) but
  // are excluded from the "sellable" totals below, same reasoning as
  // MilkLogView.
  const quarantineByFlockId = useMemo(() => {
    const map = new Map<string, HealthRecord>();
    for (const f of flocksWithEggs) {
      const active = getActiveQuarantine(healthRecords, f.id);
      if (active) map.set(f.id, active);
    }
    return map;
  }, [flocksWithEggs, healthRecords]);
  const hasAnyQuarantined = quarantineByFlockId.size > 0;

  function key(flockId: string, field: Field, forDate = date) {
    return `${flockId}__${forDate}__${field}`;
  }

  function valueFor(flockId: string, field: Field) {
    const k = key(flockId, field);
    if (k in edits) return edits[k];
    const found = eggLogs.find((e) => e.flockId === flockId && e.date === date);
    if (!found) return 0;
    return field === "collected" ? found.eggsCollected : found.eggsBroken;
  }

  function setValue(flockId: string, field: Field, next: number) {
    const k = key(flockId, field);
    const previousCollected = valueFor(flockId, "collected");
    const previousBroken = valueFor(flockId, "broken");
    setEdits((prev) => ({ ...prev, [k]: next }));
    setError(null);

    const eggsCollected = field === "collected" ? next : previousCollected;
    const eggsBroken = field === "broken" ? next : previousBroken;

    startTransition(async () => {
      const result = await upsertEggLogAction({ flockId, date, eggsCollected, eggsBroken });
      if (!result.ok) {
        setError(result.error);
        setEdits((prev) => ({ ...prev, [k]: field === "collected" ? previousCollected : previousBroken }));
      }
    });
  }

  function netFor(flockId: string) {
    return valueFor(flockId, "collected") - valueFor(flockId, "broken");
  }

  function layRate(flockId: string, birdCount: number) {
    if (birdCount === 0) return 0;
    return (valueFor(flockId, "collected") / birdCount) * 100;
  }

  const sellableFlocks = flocksWithEggs.filter((f) => !quarantineByFlockId.has(f.id));
  const totals = {
    collected: sellableFlocks.reduce((sum, f) => sum + valueFor(f.id, "collected"), 0),
    broken: sellableFlocks.reduce((sum, f) => sum + valueFor(f.id, "broken"), 0),
  };

  function shiftDate(delta: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(toISODate(d));
  }
  const isToday = date === toISODate(new Date());

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => shiftDate(-1)}
            aria-label="Previous day"
            className="h-7 w-7 rounded border border-line text-ink-500 hover:border-ink-300 hover:text-ink-900"
          >
            ‹
          </button>
          <span className="font-display text-lg text-ink-900 w-32 text-center">{formatLabel(date)}</span>
          <button
            onClick={() => shiftDate(1)}
            disabled={isToday}
            aria-label="Next day"
            className="h-7 w-7 rounded border border-line text-ink-500 hover:border-ink-300 hover:text-ink-900 disabled:opacity-30"
          >
            ›
          </button>
        </div>
        {canEdit ? (
          <span className="text-xs text-ink-500 font-mono-data">Tap any figure to edit</span>
        ) : (
          <span className="text-xs text-ink-500 font-mono-data">View only</span>
        )}
      </div>

      {error && <p className="text-sm text-danger mb-3">{error}</p>}

      <div className="border border-line rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-parchment-100/70 text-left text-ink-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-2.5 font-medium">Flock</th>
              <th className="px-4 py-2.5 font-medium text-center">Collected</th>
              <th className="px-4 py-2.5 font-medium text-center">Broken</th>
              <th className="px-4 py-2.5 font-medium text-right">Net</th>
              <th className="px-4 py-2.5 font-medium text-right">Lay rate</th>
            </tr>
          </thead>
          <tbody>
            {flocksWithEggs.map((f) => {
              const quarantine = quarantineByFlockId.get(f.id);
              return (
                <tr key={f.id} className={`border-t border-line hover:bg-parchment-100/40 ${quarantine ? "bg-danger/5" : ""}`}>
                  <td className="px-4 py-2">
                    <ViewLink href={`/poultry/${f.id}`}>{f.flockName}</ViewLink>
                    <span className="text-xs text-ink-500 ml-2 font-mono-data">{f.currentBirdCount} birds</span>
                    {quarantine && (
                      <span
                        className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-danger text-white"
                        title={`Quarantined until ${quarantine.quarantineUntilDate} — not counted in sellable totals`}
                      >
                        Quarantined
                      </span>
                    )}
                  </td>
                  {canEdit ? (
                    <>
                      <td className="px-4 py-2 text-center">
                        <EditableCell value={valueFor(f.id, "collected")} onCommit={(n) => setValue(f.id, "collected", n)} />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <EditableCell value={valueFor(f.id, "broken")} onCommit={(n) => setValue(f.id, "broken", n)} />
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-2 text-center font-mono-data text-ink-900">{valueFor(f.id, "collected")}</td>
                      <td className="px-4 py-2 text-center font-mono-data text-ink-900">{valueFor(f.id, "broken")}</td>
                    </>
                  )}
                  <td className="px-4 py-2 text-right font-mono-data text-ink-900">{netFor(f.id)}</td>
                  <td className="px-4 py-2 text-right font-mono-data text-ink-500">
                    {layRate(f.id, f.currentBirdCount).toFixed(0)}%
                  </td>
                </tr>
              );
            })}
            {flocksWithEggs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-500 text-sm">
                  No egg-laying flocks with logs yet.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-line bg-parchment-100/70 font-mono-data text-ink-900">
              <td className="px-4 py-2.5">
                Total{hasAnyQuarantined && <span className="text-[10px] text-ink-500 font-body ml-1">(sellable only)</span>}
              </td>
              <td className="px-4 py-2.5 text-center">{totals.collected}</td>
              <td className="px-4 py-2.5 text-center">{totals.broken}</td>
              <td className="px-4 py-2.5 text-right font-medium">{totals.collected - totals.broken}</td>
              <td className="px-4 py-2.5" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
