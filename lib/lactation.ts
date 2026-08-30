import type { LactationCycle } from "@/types/farm";

/**
 * Cattle IDs with a currently-active (non-dry) lactation cycle. Same
 * no-server-dependencies pattern as lib/quarantine.ts's
 * getActiveQuarantine — needed in client components (MilkLogView,
 * MilkQuickEntry), so this can't import next/headers or a PocketBase
 * server client without breaking the client bundle.
 */
export function getActiveLactationCattleIds(lactationCycles: LactationCycle[]): Set<string> {
  return new Set(lactationCycles.filter((l) => l.stage !== "dry").map((l) => l.cattleId));
}
