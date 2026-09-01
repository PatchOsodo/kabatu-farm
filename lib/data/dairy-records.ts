import { cookies } from "next/headers";
import { createPocketBaseClient } from "@/lib/pb";
import type { BreedingRecord, CalvingRecord, LactationCycle, MilkLog, UserRole } from "@/types/farm";

/** Server-side helper — builds a PocketBase client hydrated from the request's auth cookie. */
async function getServerPb() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("pb_auth")?.value;
  return createPocketBaseClient(authCookie ? `pb_auth=${authCookie}` : undefined);
}

// PocketBase stores `date`-type fields with a full timestamp
// (e.g. "2026-08-01 00:00:00.000Z"), not the plain YYYY-MM-DD the
// `ISODate` type in types/farm.ts promises. Confirmed with a real seeded
// record: MilkLogView's `m.date === date` comparison (against a plain
// `<input type="date">` value) silently matched nothing until this was
// caught. Truncating to the first 10 chars here, once, means every
// consumer downstream gets what the type actually says it gets.
function toISODate(value: string | undefined | null): string | undefined {
  return value ? value.slice(0, 10) : undefined;
}

function mapMilkLog(record: Record<string, unknown>): MilkLog {
  return {
    id: record.id as string,
    cattleId: record.cattleId as string,
    date: toISODate(record.date as string) as string,
    session: record.session as MilkLog["session"],
    liters: record.liters as number,
    recordedBy: record.recordedBy as string,
    createdAt: record.created as string,
    fatPercent: (record.fatPercent as number) ?? undefined,
    proteinPercent: (record.proteinPercent as number) ?? undefined,
    safetyStatus: (record.safetyStatus as MilkLog["safetyStatus"]) || undefined,
  };
}

function mapBreedingRecord(record: Record<string, unknown>): BreedingRecord {
  return {
    id: record.id as string,
    cattleId: record.cattleId as string,
    eventType: record.eventType as BreedingRecord["eventType"],
    eventDate: toISODate(record.eventDate as string) as string,
    sireInfo: (record.sireInfo as string) || undefined,
    technician: (record.technician as string) || undefined,
    outcome: (record.outcome as BreedingRecord["outcome"]) || undefined,
    expectedCalvingDate: toISODate(record.expectedCalvingDate as string),
    notes: (record.notes as string) || undefined,
    createdAt: record.created as string,
    updatedAt: record.updated as string,
  };
}

function mapCalvingRecord(record: Record<string, unknown>): CalvingRecord {
  return {
    id: record.id as string,
    motherId: record.motherId as string,
    calvingDate: toISODate(record.calvingDate as string) as string,
    calfId: (record.calfId as string) || undefined,
    calfSex: (record.calfSex as CalvingRecord["calfSex"]) || undefined,
    outcome: record.outcome as CalvingRecord["outcome"],
    complications: (record.complications as string) || undefined,
    assistedBy: (record.assistedBy as string) || undefined,
    createdAt: record.created as string,
    updatedAt: record.updated as string,
  };
}

function mapLactationCycle(record: Record<string, unknown>): LactationCycle {
  return {
    id: record.id as string,
    cattleId: record.cattleId as string,
    calvingRecordId: (record.calvingRecordId as string) || undefined,
    startDate: toISODate(record.startDate as string) as string,
    expectedDryOffDate: toISODate(record.expectedDryOffDate as string),
    endDate: toISODate(record.endDate as string),
    stage: record.stage as LactationCycle["stage"],
    peakYieldLiters: (record.peakYieldLiters as number) || undefined,
    totalYieldLitersToDate: record.totalYieldLitersToDate as number,
    lactationNumber: record.lactationNumber as number,
    createdAt: record.created as string,
    updatedAt: record.updated as string,
  };
}

export async function getMilkLogs(): Promise<MilkLog[]> {
  const pb = await getServerPb();
  const records = await pb.collection("milk_logs").getFullList({ sort: "-date" });
  return records.map(mapMilkLog);
}

export async function getBreedingRecords(): Promise<BreedingRecord[]> {
  const pb = await getServerPb();
  const records = await pb.collection("breeding_records").getFullList({ sort: "-eventDate" });
  return records.map(mapBreedingRecord);
}

export async function getCalvingRecords(): Promise<CalvingRecord[]> {
  const pb = await getServerPb();
  const records = await pb.collection("calving_records").getFullList({ sort: "-calvingDate" });
  return records.map(mapCalvingRecord);
}

export async function getLactationCycles(): Promise<LactationCycle[]> {
  const pb = await getServerPb();
  const records = await pb.collection("lactation_cycles").getFullList({ sort: "-startDate" });
  return records.map(mapLactationCycle);
}

export type MilkLogInput = {
  cattleId: string;
  date: string;
  session: MilkLog["session"];
  liters: number;
  recordedBy: string;
  /**
   * QBP composition fields (2026-08-31 addition) — all optional. Most
   * milk log entries won't carry these; they're attached when a
   * collection/lab test result is actually available for that entry.
   */
  fatPercent?: number;
  proteinPercent?: number;
  safetyStatus?: MilkLog["safetyStatus"];
};

/**
 * MilkLogView is a spreadsheet-style grid where any cell can be edited —
 * there's no separate "create" vs "edit" step from the user's point of
 * view, so this looks up the (cattleId, date, session) triple and updates
 * if it exists, creates if it doesn't. This mirrors createStockMovement's
 * "one logical operation, best-effort not atomic" note from the inventory
 * module: the lookup-then-write is two round trips, not a transaction.
 *
 * Composition fields (fatPercent/proteinPercent/safetyStatus) are passed
 * through on both the create and update path when present in the input —
 * on update, only fields actually included in `input` are sent, so an
 * update that doesn't touch composition data won't accidentally clear a
 * previously-recorded lab result.
 */
export async function upsertMilkLog(input: MilkLogInput): Promise<MilkLog> {
  const pb = await getServerPb();

  // PocketBase stores `date`-type fields with a full timestamp
  // (e.g. "2026-08-01 00:00:00.000Z"), so a filter doing exact string
  // equality against a plain "2026-08-01" silently matches zero rows —
  // confirmed with a real seeded record, not assumed. A day-range
  // comparison is robust to that without depending on knowing PocketBase's
  // exact normalized format string.
  const dayStart = `${input.date} 00:00:00`;
  const nextDay = new Date(input.date);
  nextDay.setDate(nextDay.getDate() + 1);
  const dayEnd = `${nextDay.toISOString().slice(0, 10)} 00:00:00`;

  const existing = await pb.collection("milk_logs").getFullList({
    filter: `cattleId = "${input.cattleId}" && date >= "${dayStart}" && date < "${dayEnd}" && session = "${input.session}"`,
  });

  const compositionFields: Partial<Pick<MilkLogInput, "fatPercent" | "proteinPercent" | "safetyStatus">> = {};
  if (input.fatPercent !== undefined) compositionFields.fatPercent = input.fatPercent;
  if (input.proteinPercent !== undefined) compositionFields.proteinPercent = input.proteinPercent;
  if (input.safetyStatus !== undefined) compositionFields.safetyStatus = input.safetyStatus;

  if (existing.length > 0) {
    const record = await pb
    .collection("milk_logs")
    .update(existing[0].id, { liters: input.liters, recordedBy: input.recordedBy, ...compositionFields });
    return record as unknown as MilkLog;
  }

  const record = await pb.collection("milk_logs").create(input);
  return record as unknown as MilkLog;
}

export async function getCurrentUserRole(): Promise<UserRole | undefined> {
  const pb = await getServerPb();
  return pb.authStore.isValid ? (pb.authStore.model?.role as UserRole | undefined) : undefined;
}

export type CalvingRecordInput = Omit<CalvingRecord, "id" | "createdAt" | "updatedAt">;

/**
 * Creates the calving_records row AND auto-starts the matching
 * lactation_cycles row — this is the actual fix for the gap found
 * 2026-08-08: LactationCycle and its "Current Lactation" UI section on
 * the cattle detail page were both fully built, but nothing anywhere in
 * the app could ever create a lactation_cycles record, so the section
 * could never render for any cow through normal use.
 *
 * Auto-creates a lactation cycle for outcome "live_birth" and
 * "stillbirth" — both are full-term parturition and trigger milk
 * let-down regardless of whether the calf survived. NOT for "aborted",
 * which implies a pregnancy loss well before term with no lactation
 * onset. This is a real judgment call, not settled veterinary fact for
 * every case — flagged to the person as an assumption, not silently
 * baked in without mention.
 *
 * lactationNumber is computed as (this cow's prior lactation cycle count
 * + 1), not left for the person to enter by hand — it's derivable and
 * error-prone to type correctly every time.
 */
export async function createCalvingRecord(
  input: CalvingRecordInput
): Promise<{ calving: CalvingRecord; lactation: LactationCycle | null }> {
  const pb = await getServerPb();

  const calvingRecord = await pb.collection("calving_records").create(input);
  const calving = mapCalvingRecord(calvingRecord);

  if (calving.outcome === "aborted") {
    return { calving, lactation: null };
  }

  const priorCycles = await pb.collection("lactation_cycles").getFullList({
    filter: `cattleId = "${calving.motherId}"`,
  });

  const lactationRecord = await pb.collection("lactation_cycles").create({
    cattleId: calving.motherId,
    calvingRecordId: calving.id,
    startDate: calving.calvingDate,
    stage: "early",
    totalYieldLitersToDate: 0,
    lactationNumber: priorCycles.length + 1,
  });

  return { calving, lactation: mapLactationCycle(lactationRecord) };
}

export type LactationUpdateInput = Partial
Pick<LactationCycle, "stage" | "endDate" | "expectedDryOffDate" | "peakYieldLiters">
>;

export async function updateLactationCycle(id: string, input: LactationUpdateInput): Promise<LactationCycle> {
  const pb = await getServerPb();
  const record = await pb.collection("lactation_cycles").update(id, input);
  return mapLactationCycle(record);
}

export async function getCurrentUserId(): Promise<string | undefined> {
  const pb = await getServerPb();
  return pb.authStore.isValid ? (pb.authStore.model?.id as string | undefined) : undefined;
}
