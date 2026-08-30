"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LinkButton } from "@/components/ui/Button";
import type { Cattle, HealthRecord, LactationCycle, MilkLog } from "@/types/farm";
import { createPocketBaseClient } from "@/lib/pb";
import { getActiveQuarantine } from "@/lib/quarantine";
import { getActiveLactationCattleIds } from "@/lib/lactation";
import {
  saveSnapshot,
  getSnapshot,
  enqueueWrite,
  listQueuedWrites,
  removeQueuedWrite,
  type LactatingCowSnapshot,
  type KnownMilkValue,
  type QueuedWrite,
} from "@/lib/offline/db";
import { flushQueue, dayRangeFilter, type MilkLogsCollectionClient } from "@/lib/offline/sync";

const SESSIONS: MilkLog["session"][] = ["morning", "midday", "evening"];
const SESSION_LABEL: Record<MilkLog["session"], string> = {
  morning: "Morning",
  midday: "Midday",
  evening: "Evening",
};

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function defaultSession(): MilkLog["session"] {
  const hour = new Date().getHours();
  if (hour < 11) return "morning";
  if (hour < 16) return "midday";
  return "evening";
}

/** Adapts the browser PocketBase SDK to the narrow interface flushQueue()/sync.ts expects — keeps sync.ts unit-testable without a real client. */
function makeMilkLogsClient(pb: ReturnType<typeof createPocketBaseClient>): MilkLogsCollectionClient {
  return {
    async getFirstListItem(filter: string) {
      try {
        const r = await pb.collection("milk_logs").getFirstListItem(filter);
        return { id: r.id, liters: r.liters as number, updated: r.updated as string };
      } catch {
        return null;
      }
    },
    async create(data) {
      const r = await pb.collection("milk_logs").create(data);
      return { id: r.id };
    },
    async update(id, data) {
      await pb.collection("milk_logs").update(id, data);
    },
  };
}

interface MilkQuickEntryProps {
  cattle: Cattle[];
  milkLogs: MilkLog[];
  lactationCycles: LactationCycle[];
  healthRecords: HealthRecord[];
  currentUserId: string;
}

type LoadState = "loading" | "online" | "offline-cached" | "unavailable";
type RowSaveState = "idle" | "saving" | "saved" | "queued" | "error";

export function MilkQuickEntry({
  cattle: initialCattle,
  milkLogs: initialMilkLogs,
  lactationCycles: initialLactationCycles,
  healthRecords,
  currentUserId,
}: MilkQuickEntryProps) {
  const [date, setDate] = useState(() => toISODate(new Date()));
  const [session, setSession] = useState<MilkLog["session"]>(() => defaultSession());
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [snapshotAge, setSnapshotAge] = useState<string | undefined>();
  const [lactatingCows, setLactatingCows] = useState<LactatingCowSnapshot[]>([]);
  const [knownValues, setKnownValues] = useState<KnownMilkValue[]>([]);
  const [rowStates, setRowStates] = useState<Record<string, RowSaveState>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [queue, setQueue] = useState<QueuedWrite[]>([]);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Non-fatal — page still works fully online without it, it just
        // won't survive a hard reload while offline.
      });
    }
  }, []);

  useEffect(() => {
    function goOnline() {
      setIsOnline(true);
    }
    function goOffline() {
      setIsOnline(false);
    }
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const refreshQueue = useCallback(async () => {
    setQueue(await listQueuedWrites());
  }, []);

  const attemptSync = useCallback(async () => {
    const pb = createPocketBaseClient();
    const client = makeMilkLogsClient(pb);
    await flushQueue(client);
    await refreshQueue();
  }, [refreshQueue]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadState("loading");
      try {
        const pb = createPocketBaseClient();
        const [cattleRecords, cycleRecords, milkRecords] = await Promise.all([
          pb.collection("cattle").getFullList(),
          pb.collection("lactation_cycles").getFullList(),
          pb.collection("milk_logs").getFullList({ filter: dayRangeFilter(toISODate(new Date())) }),
        ]);

        const cattleList = cattleRecords as unknown as Cattle[];
        const cycles = cycleRecords as unknown as LactationCycle[];
        const logs = milkRecords as unknown as (MilkLog & { updated: string })[];

        const activeIds = getActiveLactationCattleIds(cycles);
        const cows: LactatingCowSnapshot[] = cattleList
          .filter((c) => activeIds.has(c.id))
          .map((c) => {
            const q = getActiveQuarantine(healthRecords, c.id);
            return { id: c.id, tagId: c.tagId, name: c.name ?? c.tagId, quarantinedUntil: q?.quarantineUntilDate };
          });

        const known: KnownMilkValue[] = logs.map((l) => ({
          cattleId: l.cattleId,
          date: l.date,
          session: l.session,
          liters: l.liters,
          pbId: (l as unknown as { id: string }).id,
          updated: l.updated,
        }));

        if (cancelled) return;
        setLactatingCows(cows);
        setKnownValues(known);
        setLoadState("online");
        await saveSnapshot({ savedAt: new Date().toISOString(), cattle: cows, knownValues: known });
        await attemptSync();
      } catch {
        const snap = await getSnapshot();
        if (cancelled) return;
        if (snap) {
          setLactatingCows(snap.cattle);
          setKnownValues(snap.knownValues);
          setSnapshotAge(snap.savedAt);
          setLoadState("offline-cached");
        } else if (initialCattle.length > 0) {
          const activeIds = getActiveLactationCattleIds(initialLactationCycles);
          const cows = initialCattle
            .filter((c) => activeIds.has(c.id))
            .map((c) => ({ id: c.id, tagId: c.tagId, name: c.name ?? c.tagId }));
          setLactatingCows(cows);
          setKnownValues(
            initialMilkLogs.map((l) => ({ cattleId: l.cattleId, date: l.date, session: l.session, liters: l.liters }))
          );
          setLoadState("online");
        } else {
          setLoadState("unavailable");
        }
      }
      await refreshQueue();
    }

    load();
    return () => {
      cancelled = true;
    };
    // Deliberately only on mount — fetches once, then relies on local
    // state + the offline queue rather than refetching on every
    // date/session change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isOnline) attemptSync();
  }, [isOnline, attemptSync]);

  const quarantineMap = useMemo(() => {
    const map = new Map<string, HealthRecord>();
    for (const c of lactatingCows) {
      const active = getActiveQuarantine(healthRecords, c.id);
      if (active) map.set(c.id, active);
    }
    return map;
  }, [lactatingCows, healthRecords]);

  function findKnown(cattleId: string): KnownMilkValue | undefined {
    return knownValues.find((k) => k.cattleId === cattleId && k.date === date && k.session === session);
  }

  function draftKey(cattleId: string) {
    return `${cattleId}__${date}__${session}`;
  }

  function currentDraft(cattleId: string): string {
    const k = draftKey(cattleId);
    if (k in drafts) return drafts[k];
    const known = findKnown(cattleId);
    return known && known.liters > 0 ? String(known.liters) : "";
  }

  async function commit(cattleId: string, raw: string) {
    const k = draftKey(cattleId);
    setDrafts((prev) => ({ ...prev, [k]: raw }));

    const parsed = parseFloat(raw);
    const liters = Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 10) / 10 : undefined;
    const known = findKnown(cattleId);
    if (liters === undefined || liters === (known?.liters ?? 0)) return;

    setRowStates((prev) => ({ ...prev, [cattleId]: "saving" }));

    const baseline = known ? { liters: known.liters, pbId: known.pbId, updated: known.updated } : null;

    try {
      const pb = createPocketBaseClient();
      const filter = `cattleId = "${cattleId}" && ${dayRangeFilter(date)} && session = "${session}"`;
      let existing: { id: string; updated: string } | null = null;
      try {
        existing = await pb.collection("milk_logs").getFirstListItem(filter);
      } catch {
        existing = null;
      }

      if (existing) {
        await pb.collection("milk_logs").update(existing.id, { liters });
      } else {
        await pb.collection("milk_logs").create({ cattleId, date, session, liters, recordedBy: currentUserId });
      }

      // create()/update() responses don't include `updated` (confirmed
      // against a real server — PocketBase v0.23 only returns it if the
      // collection has an explicit autodate field AND it's requested;
      // see pb_migrations/021_milk_logs_autodate_fields.js). Re-fetch to
      // get the real timestamp for the next baseline comparison —
      // storing a stale/missing one here would silently break future
      // conflict detection for this exact row.
      const fresh = await pb.collection("milk_logs").getFirstListItem(filter);
      setKnownValues((prev) => [
        ...prev.filter((v) => !(v.cattleId === cattleId && v.date === date && v.session === session)),
        { cattleId, date, session, liters, pbId: fresh.id, updated: (fresh as unknown as { updated: string }).updated },
      ]);
      setRowStates((prev) => ({ ...prev, [cattleId]: "saved" }));
      setTimeout(() => setRowStates((prev) => ({ ...prev, [cattleId]: "idle" })), 1200);
    } catch {
      await enqueueWrite({
        queueId: `${cattleId}__${date}__${session}__${Date.now()}`,
        cattleId,
        cattleName: lactatingCows.find((c) => c.id === cattleId)?.name ?? cattleId,
        date,
        session,
        liters,
        baseline,
        queuedAt: new Date().toISOString(),
        recordedBy: currentUserId,
      });
      setRowStates((prev) => ({ ...prev, [cattleId]: "queued" }));
      await refreshQueue();
    }
  }

  async function resolveConflictKeepServer(item: QueuedWrite) {
    await removeQueuedWrite(item.queueId);
    await refreshQueue();
  }

  async function resolveConflictOverwrite(item: QueuedWrite) {
    try {
      const pb = createPocketBaseClient();
      const filter = `cattleId = "${item.cattleId}" && ${dayRangeFilter(item.date)} && session = "${item.session}"`;
      const existing = await pb.collection("milk_logs").getFirstListItem(filter).catch(() => null);
      if (existing) {
        await pb.collection("milk_logs").update(existing.id, { liters: item.liters });
      } else {
        await pb
          .collection("milk_logs")
          .create({ cattleId: item.cattleId, date: item.date, session: item.session, liters: item.liters, recordedBy: item.recordedBy });
      }
      await removeQueuedWrite(item.queueId);
      await refreshQueue();
    } catch {
      // Leave it queued as a conflict — person can retry once back online.
    }
  }

  const isToday = date === toISODate(new Date());
  const pendingCount = queue.filter((q) => q.status === "pending" || q.status === "syncing").length;
  const conflicts = queue.filter((q) => q.status === "conflict");
  const failedCount = queue.filter((q) => q.status === "failed").length;

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-2 mb-4 text-xs">
        <span
          className={[
            "inline-flex items-center gap-1.5 px-2 py-1 rounded-full font-medium",
            isOnline ? "bg-forest-700/10 text-forest-700" : "bg-clay-600/10 text-clay-600",
          ].join(" ")}
        >
          <span className={["h-1.5 w-1.5 rounded-full", isOnline ? "bg-forest-700" : "bg-clay-600"].join(" ")} />
          {isOnline ? "Online" : "Offline — entries will sync automatically"}
        </span>
        {pendingCount > 0 && (
          <span className="px-2 py-1 rounded-full bg-gold-500/10 text-gold-600 font-medium">{pendingCount} pending sync</span>
        )}
        {conflicts.length > 0 && (
          <span className="px-2 py-1 rounded-full bg-danger/10 text-danger font-medium">{conflicts.length} need review</span>
        )}
        {failedCount > 0 && (
          <span className="px-2 py-1 rounded-full bg-danger/10 text-danger font-medium">{failedCount} failed</span>
        )}
      </div>

      {loadState === "offline-cached" && (
        <p className="text-xs text-clay-600 mb-4 border border-clay-600/30 bg-clay-600/5 rounded px-3 py-2">
          You&apos;re offline. Showing the last synced list from {snapshotAge ? new Date(snapshotAge).toLocaleString("en-KE") : "earlier"}.
          New entries save locally and sync automatically once you&apos;re back online.
        </p>
      )}
      {loadState === "unavailable" && (
        <p className="text-sm text-danger mb-4">
          This page needs to load once while online before it can work offline. Please connect and reopen it.
        </p>
      )}

      {conflicts.length > 0 && (
        <div className="mb-6 border border-danger/30 rounded p-4 bg-danger/5">
          <h3 className="font-display text-sm text-ink-900 mb-3">Needs your review</h3>
          <p className="text-xs text-ink-500 mb-3">
            Someone else recorded a different value for these before your entry synced. Pick which one is correct.
          </p>
          <ul className="space-y-3">
            {conflicts.map((c) => (
              <li key={c.queueId} className="text-sm">
                <div className="font-medium text-ink-900">
                  {c.cattleName} — {c.date} {SESSION_LABEL[c.session]}
                </div>
                <div className="text-xs text-ink-500 mb-2">
                  Your entry: <span className="font-mono-data">{c.liters} L</span> · Current on server:{" "}
                  <span className="font-mono-data">{c.conflictServerValue ?? "—"} L</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => resolveConflictKeepServer(c)}
                    className="text-xs px-2.5 py-1 rounded border border-line hover:border-ink-300"
                  >
                    Keep server value ({c.conflictServerValue} L)
                  </button>
                  <button
                    onClick={() => resolveConflictOverwrite(c)}
                    className="text-xs px-2.5 py-1 rounded border border-danger/40 text-danger hover:bg-danger/5"
                  >
                    Use mine instead ({c.liters} L)
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="date"
          value={date}
          max={toISODate(new Date())}
          onChange={(e) => setDate(e.target.value)}
          className="text-sm px-3 py-2 rounded border border-line bg-parchment-50 focus:outline-none focus:border-gold-500"
        />
        <div className="flex rounded border border-line overflow-hidden">
          {SESSIONS.map((s) => (
            <button
              key={s}
              onClick={() => setSession(s)}
              className={[
                "px-4 py-2 text-sm transition-colors",
                s === session ? "bg-forest-900 text-parchment-50" : "text-ink-700 hover:bg-parchment-100/70",
              ].join(" ")}
            >
              {SESSION_LABEL[s]}
            </button>
          ))}
        </div>
        {!isToday && <span className="text-xs text-clay-600">Entering for a past date — requires network</span>}
      </div>

      {loadState === "loading" && <p className="text-sm text-ink-500">Loading…</p>}

      {loadState !== "loading" && lactatingCows.length === 0 && (
        <div className="border border-line rounded p-8 text-center text-sm text-ink-500">
          No cows are currently lactating. Log a calving on a cow&apos;s page first.
        </div>
      )}

      <ul className="space-y-2">
        {lactatingCows.map((c) => {
          const quarantine = quarantineMap.get(c.id);
          const state = rowStates[c.id] ?? "idle";
          return (
            <li
              key={c.id}
              className={[
                "flex items-center justify-between gap-4 border rounded px-4 py-3",
                quarantine ? "border-danger/30 bg-danger/5" : "border-line",
              ].join(" ")}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono-data text-xs text-ink-500">{c.tagId}</span>
                  <span className="font-medium text-ink-900 truncate">{c.name}</span>
                  {quarantine && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-danger text-white shrink-0">
                      Quarantined
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  placeholder="0.0"
                  disabled={!isToday && loadState !== "online"}
                  value={currentDraft(c.id)}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [draftKey(c.id)]: e.target.value }))}
                  onBlur={(e) => commit(c.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                  className={[
                    "w-24 text-right font-mono-data text-lg px-3 py-2 rounded border bg-white focus:outline-none",
                    state === "error" ? "border-danger" : "border-line focus:border-gold-500",
                  ].join(" ")}
                />
                <span className="text-xs text-ink-500 w-6">L</span>
                <span className="w-14 text-center text-xs" aria-hidden>
                  {state === "saving" && <span className="text-ink-300">…</span>}
                  {state === "saved" && <span className="text-forest-700">✓ saved</span>}
                  {state === "queued" && <span className="text-gold-600">queued</span>}
                  {state === "error" && <span className="text-danger">error</span>}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-6">
        <LinkButton href="/dairy/milk-log" variant="secondary" size="sm">
          Back to log
        </LinkButton>
      </div>
    </div>
  );
}
