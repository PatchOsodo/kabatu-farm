// Run with: npx tsx lib/offline/sync.manual-test.ts
// Not a unit test framework file (no jest/vitest configured in this
// project) — a standalone script using fake-indexeddb so this can
// actually exercise real IndexedDB semantics instead of a hand-rolled
// mock of the DB layer, which would risk testing my own assumptions
// about IndexedDB rather than its real behavior.

import "fake-indexeddb/auto";
import { enqueueWrite, listQueuedWrites, type QueuedWrite } from "./db";
import { flushQueue, dayRangeFilter, type MilkLogsCollectionClient } from "./sync";

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.log(`  FAIL: ${label}`);
    failed++;
  }
}

// In-memory fake "server" — a stand-in for PocketBase's milk_logs collection.
class FakeServer implements MilkLogsCollectionClient {
  records = new Map<string, { id: string; cattleId: string; date: string; session: string; liters: number; updated: string }>();
  private nextId = 1;
  private updateCounter = 0;

  private nextUpdatedStamp(): string {
    this.updateCounter += 1;
    return `t${this.updateCounter}`;
  }

  async getFirstListItem(filter: string) {
    // Parse the day-range filter shape sync.ts now produces:
    // cattleId = "X" && date >= "Y 00:00:00" && date < "Z 00:00:00" && session = "W"
    const m = filter.match(/cattleId = "([^"]+)" && date >= "([^"]+) 00:00:00" && date < "[^"]+" && session = "([^"]+)"/);
    if (!m) throw new Error("unexpected filter shape: " + filter);
    const [, cattleId, date, session] = m;
    for (const r of this.records.values()) {
      if (r.cattleId === cattleId && r.date === date && r.session === session) {
        return { id: r.id, liters: r.liters, updated: r.updated };
      }
    }
    throw new Error("no match"); // mirrors PocketBase's real getFirstListItem behavior (throws on no match)
  }

  async create(data: { cattleId: string; date: string; session: string; liters: number; recordedBy: string }) {
    const id = `rec_${this.nextId++}`;
    this.records.set(id, { id, cattleId: data.cattleId, date: data.date, session: data.session, liters: data.liters, updated: this.nextUpdatedStamp() });
    return { id };
  }

  async update(id: string, data: { liters: number }) {
    const existing = this.records.get(id);
    if (!existing) throw new Error("not found");
    existing.liters = data.liters;
    existing.updated = this.nextUpdatedStamp();
  }

  // Test helper: simulate a DIFFERENT device/user writing directly, bypassing our queue
  externalWrite(cattleId: string, date: string, session: string, liters: number) {
    const existing = [...this.records.values()].find((r) => r.cattleId === cattleId && r.date === date && r.session === session);
    if (existing) {
      existing.liters = liters;
      existing.updated = this.nextUpdatedStamp();
    } else {
      const id = `rec_${this.nextId++}`;
      this.records.set(id, { id, cattleId, date, session, liters, updated: this.nextUpdatedStamp() });
    }
  }
}

async function clearQueueForTest() {
  const items = await listQueuedWrites();
  for (const item of items) {
    // db.ts doesn't export a "clear all" — reuse removeQueuedWrite per item
    const { removeQueuedWrite } = await import("./db");
    await removeQueuedWrite(item.queueId);
  }
}

async function scenarioA_cleanSyncNewEntry() {
  console.log("\nScenario A: brand new entry, no conflict — should sync cleanly");
  await clearQueueForTest();
  const server = new FakeServer();

  await enqueueWrite({
    queueId: "q1",
    cattleId: "cow1",
    cattleName: "Amani",
    date: "2026-08-09",
    session: "morning",
    liters: 12.5,
    baseline: null, // this device believed nothing existed yet — and it's right
    queuedAt: new Date().toISOString(),
    recordedBy: "user1",
  } satisfies Omit<QueuedWrite, "status">);

  const result = await flushQueue(server);
  assert(result.synced === 1 && result.conflicts === 0 && result.failed === 0, "reports 1 synced, 0 conflicts");
  assert([...server.records.values()][0]?.liters === 12.5, "server record has the correct value");
  assert((await listQueuedWrites()).length === 0, "queue is empty after a clean sync");
}

async function scenarioB_someoneElseCreatedWhileOffline() {
  console.log("\nScenario B: two people offline, BOTH think it's a new entry — must NOT silently overwrite");
  await clearQueueForTest();
  const server = new FakeServer();

  // Device A syncs first — creates the record for real.
  await enqueueWrite({
    queueId: "qA",
    cattleId: "cow2",
    cattleName: "Bahati",
    date: "2026-08-09",
    session: "morning",
    liters: 10.0,
    baseline: null,
    queuedAt: "2026-08-09T06:00:00.000Z",
    recordedBy: "userA",
  });
  await flushQueue(server);

  // Device B was ALSO offline this whole time, independently entered a
  // DIFFERENT number for the same cow/session, also believing (at the
  // time it was typed) that nothing existed yet.
  await enqueueWrite({
    queueId: "qB",
    cattleId: "cow2",
    cattleName: "Bahati",
    date: "2026-08-09",
    session: "morning",
    liters: 11.5, // different value than device A's
    baseline: null,
    queuedAt: "2026-08-09T06:05:00.000Z",
    recordedBy: "userB",
  });

  const result = await flushQueue(server);
  assert(result.conflicts === 1 && result.synced === 0, "device B's write is flagged as a conflict, not synced");
  assert([...server.records.values()][0]?.liters === 10.0, "server still has device A's original 10.0 — NOT silently overwritten by 11.5");

  const remaining = await listQueuedWrites();
  const conflictItem = remaining.find((i) => i.queueId === "qB");
  assert(conflictItem?.status === "conflict", "queue item qB is marked status=conflict");
  assert(conflictItem?.conflictServerValue === 10.0, "conflict item records the server's actual value (10.0) for the person to compare against");
}

async function scenarioC_someoneElseEditedExistingRecord() {
  console.log("\nScenario C: existing record gets edited by someone else between baseline capture and flush");
  await clearQueueForTest();
  const server = new FakeServer();

  // Establish a baseline record.
  const created = await server.create({ cattleId: "cow3", date: "2026-08-09", session: "evening", liters: 8.0, recordedBy: "userA" });
  const baselineRecord = await server.getFirstListItem(`cattleId = "cow3" && ${dayRangeFilter("2026-08-09")} && session = "evening"`);

  // Someone else (a different device, already online) corrects it directly.
  server.externalWrite("cow3", "2026-08-09", "evening", 9.5);

  // Meanwhile, THIS device was offline and queued its own (stale-baseline) edit.
  await enqueueWrite({
    queueId: "qC",
    cattleId: "cow3",
    cattleName: "Chumvi",
    date: "2026-08-09",
    session: "evening",
    liters: 8.2, // this device's correction, based on the now-stale 8.0 it last saw
    baseline: { liters: 8.0, pbId: baselineRecord!.id, updated: baselineRecord!.updated },
    queuedAt: new Date().toISOString(),
    recordedBy: "userB",
  });

  const result = await flushQueue(server);
  assert(result.conflicts === 1, "flagged as a conflict, since the record moved on without this device knowing");
  assert([...server.records.values()][0]?.liters === 9.5, "server keeps the other device's 9.5, not silently overwritten by the stale-baseline 8.2");
}

async function scenarioD_legitimateOwnResync() {
  console.log("\nScenario D: this device's own baseline is still current — should apply cleanly, not false-flag");
  await clearQueueForTest();
  const server = new FakeServer();

  const created = await server.create({ cattleId: "cow4", date: "2026-08-09", session: "midday", liters: 5.0, recordedBy: "userA" });
  const baselineRecord = await server.getFirstListItem(`cattleId = "cow4" && ${dayRangeFilter("2026-08-09")} && session = "midday"`);

  // Same device corrects its own entry — nobody else touched it in between.
  await enqueueWrite({
    queueId: "qD",
    cattleId: "cow4",
    cattleName: "Doto",
    date: "2026-08-09",
    session: "midday",
    liters: 5.3,
    baseline: { liters: 5.0, pbId: baselineRecord!.id, updated: baselineRecord!.updated },
    queuedAt: new Date().toISOString(),
    recordedBy: "userA",
  });

  const result = await flushQueue(server);
  assert(result.synced === 1 && result.conflicts === 0, "applies cleanly — no false conflict on a legitimate own-correction");
  assert([...server.records.values()][0]?.liters === 5.3, "server reflects the corrected value");
}

async function main() {
  await scenarioA_cleanSyncNewEntry();
  await scenarioB_someoneElseCreatedWhileOffline();
  await scenarioC_someoneElseEditedExistingRecord();
  await scenarioD_legitimateOwnResync();

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main();
