// Minimal IndexedDB wrapper, no external library — this needs to work
// inside a Service Worker context too (fake-indexeddb polyfills the same
// API in tests), so a wrapper library that assumes a window/DOM wouldn't
// be safe to reuse there later.

const DB_NAME = "kabatu-offline";
const DB_VERSION = 1;
const SNAPSHOT_STORE = "milk-entry-snapshot";
const QUEUE_STORE = "milk-entry-queue";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
        db.createObjectStore(SNAPSHOT_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        db.createObjectStore(QUEUE_STORE, { keyPath: "queueId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface LactatingCowSnapshot {
  id: string;
  tagId: string;
  name: string;
  quarantinedUntil?: string; // ISODate, if currently quarantined
}

/**
 * Latest known value per (cattleId, date, session) key, so the offline
 * page can show what's already logged without a live server round trip.
 * Also carries `pbId` (the milk_logs record id) and `updated` (its
 * PocketBase updated timestamp) — both needed at sync time to detect
 * whether someone else changed this exact record while this device was
 * offline, see sync.ts.
 *
 * fatPercent/proteinPercent/safetyStatus (QBP composition fields) added
 * so the entry form can pre-fill an existing lab result on reload —
 * previously only `liters` was carried here, so composition data
 * entered in one session appeared to vanish (was actually just never
 * fetched back) after a page reload.
 */
export interface KnownMilkValue {
  cattleId: string;
  date: string;
  session: string;
  liters: number;
  pbId?: string;
  updated?: string;
  fatPercent?: number;
  proteinPercent?: number;
  safetyStatus?: "passed" | "failed";
}

export interface Snapshot {
  id: "current"; // singleton row — one snapshot, always overwritten
  savedAt: string;
  cattle: LactatingCowSnapshot[];
  knownValues: KnownMilkValue[];
}

export async function saveSnapshot(snapshot: Omit<Snapshot, "id">): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SNAPSHOT_STORE, "readwrite");
    tx.objectStore(SNAPSHOT_STORE).put({ id: "current", ...snapshot });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getSnapshot(): Promise<Snapshot | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SNAPSHOT_STORE, "readonly");
    const req = tx.objectStore(SNAPSHOT_STORE).get("current");
    req.onsuccess = () => resolve(req.result as Snapshot | undefined);
    req.onerror = () => reject(req.error);
  });
}

export type QueueStatus = "pending" | "syncing" | "conflict" | "failed";

/**
 * One offline submission. `baseline` records what THIS DEVICE believed
 * the value was when the person typed it — either the last known synced
 * value, or "none" for a brand new entry. Sync compares this against
 * what the server actually has at flush time to detect whether someone
 * else changed it in the meantime (see sync.ts's conflict check).
 *
 * fatPercent/proteinPercent/safetyStatus (QBP composition fields,
 * 2026-08-31) are carried through the offline queue same as liters —
 * without this, a lab result attached while offline would silently be
 * lost on sync, since flushQueue's create()/update() calls only send
 * what's in the QueuedWrite record.
 */
export interface QueuedWrite {
  queueId: string; // client-generated, stable across retries
  cattleId: string;
  cattleName: string; // denormalized for display in the sync/conflict UI without a lookup
  date: string;
  session: "morning" | "midday" | "evening";
  liters: number;
  baseline: { liters: number; pbId?: string; updated?: string } | null;
  queuedAt: string;
  status: QueueStatus;
  recordedBy: string;
  conflictServerValue?: number; // populated only when status === "conflict"
  fatPercent?: number;
  proteinPercent?: number;
  safetyStatus?: "passed" | "failed";
}

export async function enqueueWrite(write: Omit<QueuedWrite, "status">): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readwrite");
    tx.objectStore(QUEUE_STORE).put({ ...write, status: "pending" satisfies QueueStatus });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listQueuedWrites(): Promise<QueuedWrite[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readonly");
    const req = tx.objectStore(QUEUE_STORE).getAll();
    req.onsuccess = () => resolve(req.result as QueuedWrite[]);
    req.onerror = () => reject(req.error);
  });
}

export async function updateQueuedWrite(queueId: string, patch: Partial<QueuedWrite>): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readwrite");
    const store = tx.objectStore(QUEUE_STORE);
    const getReq = store.get(queueId);
    getReq.onsuccess = () => {
      const existing = getReq.result as QueuedWrite | undefined;
      if (existing) store.put({ ...existing, ...patch });
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function removeQueuedWrite(queueId: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(QUEUE_STORE, "readwrite");
    tx.objectStore(QUEUE_STORE).delete(queueId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
