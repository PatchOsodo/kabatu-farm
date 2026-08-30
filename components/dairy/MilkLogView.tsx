"use client";

import { useMemo, useState } from "react";
import { ViewLink, LinkButton } from "@/components/ui/Button";
import type { Cattle, HealthRecord, LactationCycle, MilkLog } from "@/types/farm";
import { getActiveQuarantine } from "@/lib/quarantine";
import { getActiveLactationCattleIds } from "@/lib/lactation";

const SESSIONS: MilkLog["session"][] = ["morning", "midday", "evening"];
const SESSION_LABEL: Record<MilkLog["session"], string> = {
  morning: "AM",
  midday: "Noon",
  evening: "PM",
};

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatLabel(iso: string) {
  const d = new Date(iso);
  const today = toISODate(new Date());
  const yesterday = toISODate(new Date(Date.now() - 86400000));
  if (iso === today) return "Today";
  if (iso === yesterday) return "Yesterday";
  return d.toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" });
}

interface MilkLogViewProps {
  cattle: Cattle[];
  milkLogs: MilkLog[];
  lactationCycles: LactationCycle[];
  healthRecords: HealthRecord[];
  canEdit: boolean;
}

/**
 * Pure history/view grid — no inline editing here anymore (2026-08-08
 * redesign, at the person's request: mixing "view the log" and "enter
 * today's numbers" in the same wide table was confusing, especially for
 * someone standing in the barn keying in values quickly rather than
 * reviewing history). Entering milk now happens on the dedicated
 * /dairy/milk-log/entry page instead — this component just displays.
 */
export function MilkLogView({ cattle, milkLogs, lactationCycles, healthRecords, canEdit }: MilkLogViewProps) {
  const [date, setDate] = useState(() => toISODate(new Date()));

  const activeLactationCattleIds = useMemo(() => getActiveLactationCattleIds(lactationCycles), [lactationCycles]);
  const lactatingCattle = useMemo(
    () => cattle.filter((c) => activeLactationCattleIds.has(c.id) || milkLogs.some((m) => m.cattleId === c.id)),
    [cattle, milkLogs, activeLactationCattleIds]
  );

  const quarantineByCattleId = useMemo(() => {
    const map = new Map<string, HealthRecord>();
    for (const c of lactatingCattle) {
      const active = getActiveQuarantine(healthRecords, c.id);
      if (active) map.set(c.id, active);
    }
    return map;
  }, [lactatingCattle, healthRecords]);
  const hasAnyQuarantined = quarantineByCattleId.size > 0;

  function valueFor(cattleId: string, session: MilkLog["session"]) {
    const found = milkLogs.find((m) => m.cattleId === cattleId && m.date === date && m.session === session);
    return found?.liters ?? 0;
  }

  function rowTotal(cattleId: string) {
    return SESSIONS.reduce((sum, s) => sum + valueFor(cattleId, s), 0);
  }

  const sellableCattle = lactatingCattle.filter((c) => !quarantineByCattleId.has(c.id));

  function sessionTotal(session: MilkLog["session"]) {
    return sellableCattle.reduce((sum, c) => sum + valueFor(c.id, session), 0);
  }

  const grandTotal = sellableCattle.reduce((sum, c) => sum + rowTotal(c.id), 0);

  function shiftDate(deltaDays: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + deltaDays);
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
            className="h-7 w-7 rounded border border-line text-ink-500 hover:border-ink-300 hover:text-ink-900 disabled:opacity-30 disabled:hover:border-line"
          >
            ›
          </button>
        </div>
        {canEdit && (
          <LinkButton href="/dairy/milk-log/entry" variant="primary" size="sm">
            Enter milk
          </LinkButton>
        )}
      </div>

      <div className="border border-line rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-parchment-100/70 text-left text-ink-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-2.5 font-medium">Cow</th>
              {SESSIONS.map((s) => (
                <th key={s} className="px-4 py-2.5 font-medium text-center">
                  {SESSION_LABEL[s]}
                </th>
              ))}
              <th className="px-4 py-2.5 font-medium text-right">Total (L)</th>
            </tr>
          </thead>
          <tbody>
            {lactatingCattle.map((c) => {
              const quarantine = quarantineByCattleId.get(c.id);
              return (
                <tr
                  key={c.id}
                  className={`border-t border-line hover:bg-parchment-100/40 ${quarantine ? "bg-danger/5" : ""}`}
                >
                  <td className="px-4 py-2">
                    <ViewLink href={`/dairy/${c.id}`}>
                      <span className="font-mono-data text-xs text-ink-500 mr-2">{c.tagId}</span>
                      {c.name}
                    </ViewLink>
                    {quarantine && (
                      <span
                        className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-danger text-white"
                        title={`Quarantined until ${quarantine.quarantineUntilDate} — not counted in sellable totals`}
                      >
                        Quarantined
                      </span>
                    )}
                  </td>
                  {SESSIONS.map((s) => (
                    <td key={s} className="px-4 py-2 text-center font-mono-data text-ink-900">
                      {valueFor(c.id, s) > 0 ? valueFor(c.id, s).toFixed(1) : "–"}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right font-mono-data text-ink-900">{rowTotal(c.id).toFixed(1)}</td>
                </tr>
              );
            })}
            {lactatingCattle.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-500 text-sm">
                  No cows are currently lactating. Log a calving on a cow's page to start tracking its milk here.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-line bg-parchment-100/70 font-mono-data text-ink-900">
              <td className="px-4 py-2.5">
                Session total{hasAnyQuarantined && <span className="text-[10px] text-ink-500 font-body ml-1">(sellable only)</span>}
              </td>
              {SESSIONS.map((s) => (
                <td key={s} className="px-4 py-2.5 text-center">
                  {sessionTotal(s).toFixed(1)}
                </td>
              ))}
              <td className="px-4 py-2.5 text-right font-medium">{grandTotal.toFixed(1)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
