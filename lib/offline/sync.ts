import { listQueuedWrites, removeQueuedWrite, updateQueuedWrite, type QueuedWrite } from "./db";

/**
 * PocketBase stores `date`-type fields as a full timestamp (e.g.
 * "2026-08-09 00:00:00.000Z"), so a filter doing exact string equality
 * against a plain "2026-08-09" silently matches zero rows — this is a
 * known issue already documented and solved once in this project (see
 * lib/data/dairy-records.ts's upsertMilkLog). A day-range comparison is
 * robust to that without depending on knowing PocketBase's exact
 * normalized format string. Exported so both this file and the client
 * component use the identical pattern rather than each reimplementing
 * their own (and risking a THIRD divergent copy of this same fix).
 */
export function dayRangeFilter(dateISO: string): string {
  const dayStart = `${dateISO} 00:00:00`;
  const nextDay = new Date(dateISO);
  nextDay.setDate(nextDay.getDate() + 1);
  const dayEnd = `${nextDay.toISOString().slice(0, 10)} 00:00:00`;
  return `date >= "${dayStart}" && date < "${dayEnd}"`;
}

/**
 * Minimal shape of what this needs from a PocketBase client — kept
 * narrow and interface-based (not importing the real PocketBase type)
 * so this logic can be unit-tested with a plain mock object, no real
 * network or browser required. See lib/offline/sync.test.ts.
 */
export interface MilkLogsCollectionClient {
  getFirstListItem(filter: string): Promise<{ id: string; liters: number; updated: string } | null>;
  create(data: { cattleId: string; date: string; session: string; liters: number; recordedBy: string }): Promise<{ id: string }>;
  update(id: string, data: { liters: number }): Promise<void>;
}

export interface FlushResult {
  synced: number;
  conflicts: number;
  failed: number;
}

/**
 * The core correctness guarantee: NEVER blindly overwrite a milk_logs
 * record this device didn't know the current state of. Every queued
 * write's `baseline` captures what this device last saw for that exact
 * (cattleId, date, session) key. At flush time we re-fetch the live
 * server record and compare:
 *
 *  - baseline said "nothing exists yet" but the server now HAS a record
 *    -> someone else created one while we were offline -> CONFLICT.
 *  - baseline pointed at a specific record but that record's `updated`
 *    timestamp has moved on -> someone else edited it after we last
 *    knew about it -> CONFLICT.
 *  - baseline pointed at a record that no longer exists -> someone
 *    deleted it -> CONFLICT (don't silently resurrect it).
 *  - otherwise -> genuinely safe to write, nobody else touched this key.
 *
 * Conflicts are never auto-resolved here — they're left in the queue
 * with status "conflict" and the server's current value attached, for a
 * person to look at and decide which number is actually correct. This
 * function is deliberately never called again for an item already
 * marked "conflict" (see the skip at the top of the loop) — silently
 * retrying a conflict would just flip a coin on whose data wins.
 */
export async function flushQueue(milkLogs: MilkLogsCollectionClient): Promise<FlushResult> {
  const items = await listQueuedWrites();
  const result: FlushResult = { synced: 0, conflicts: 0, failed: 0 };

  for (const item of items) {
    if (item.status === "conflict") continue;

    try {
      const server = await milkLogs
        .getFirstListItem(`cattleId = "${item.cattleId}" && ${dayRangeFilter(item.date)} && session = "${item.session}"`)
        .catch(() => null);

      const conflict = detectConflict(item, server);
      if (conflict) {
        await updateQueuedWrite(item.queueId, {
          status: "conflict",
          conflictServerValue: server?.liters,
        });
        result.conflicts++;
        continue;
      }

      if (server) {
        await milkLogs.update(server.id, { liters: item.liters });
      } else {
        await milkLogs.create({
          cattleId: item.cattleId,
          date: item.date,
          session: item.session,
          liters: item.liters,
          recordedBy: item.recordedBy,
        });
      }
      await removeQueuedWrite(item.queueId);
      result.synced++;
    } catch {
      await updateQueuedWrite(item.queueId, { status: "failed" });
      result.failed++;
    }
  }

  return result;
}

function detectConflict(
  item: QueuedWrite,
  server: { id: string; liters: number; updated: string } | null
): boolean {
  if (item.baseline === null) {
    // We thought this was a brand new entry. If the server now has a
    // record, somebody else created one while we were offline.
    return server !== null;
  }
  // We knew about an existing record. Gone entirely, or its updated
  // timestamp moved on without us -> somebody else touched it.
  if (server === null) return true;
  if (server.id !== item.baseline.pbId) return true;
  return server.updated !== item.baseline.updated;
}
