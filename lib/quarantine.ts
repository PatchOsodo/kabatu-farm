import type { HealthRecord } from "@/types/farm";

/**
 * The single source of truth for "is this animal quarantined right now" —
 * quarantineUntilDate > today, not a separate status field. Returns the
 * record itself (not just a boolean) so callers can show the withdrawal
 * date, since "quarantined until when" is what actually matters to
 * someone deciding whether an animal's milk/meat is sellable.
 *
 * Deliberately a plain function with no server dependencies (no
 * next/headers, no PocketBase client) — it needs to run in both
 * server components (cattle detail/list pages) and client components
 * (MilkLogView's per-cell exclusion logic). Importing it from
 * lib/data/health.ts instead would pull that file's `cookies()` usage
 * into any client bundle that imports it, which Next.js correctly
 * rejects at build time.
 */
export function getActiveQuarantine(
  healthRecords: HealthRecord[],
  animalId: string
): HealthRecord | undefined {
  const today = new Date().toISOString().slice(0, 10);
  return healthRecords
    .filter((r) => r.animalId === animalId && r.quarantineUntilDate && r.quarantineUntilDate > today)
    .sort((a, b) => (b.quarantineUntilDate ?? "").localeCompare(a.quarantineUntilDate ?? ""))[0];
}
