import { cookies } from "next/headers";
import { createPocketBaseClient } from "@/lib/pb";
import { createTransaction } from "@/lib/data/financials";
import type {
  LambingRecord,
  MeatOffFlockRecord,
  SheepFlock,
  UserRole,
  WoolHarvestRecord,
} from "@/types/farm";

/** Server-side helper — builds a PocketBase client hydrated from the request's auth cookie. */
async function getServerPb() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("pb_auth")?.value;
  return createPocketBaseClient(authCookie ? `pb_auth=${authCookie}` : undefined);
}

// See lib/data/dairy-records.ts's toISODate — PocketBase stores `date`-type
// fields as a full timestamp ("2026-08-01 00:00:00.000Z"), not the plain
// YYYY-MM-DD the ISODate type promises. Confirmed there with a real
// seeded record; applying the same normalization here from the start
// rather than rediscovering the bug.
function toISODate(value: string | undefined | null): string | undefined {
  return value ? value.slice(0, 10) : undefined;
}

function mapSheepFlock(record: Record<string, unknown>): SheepFlock {
  return {
    id: record.id as string,
    flockName: record.flockName as string,
    breed: record.breed as string,
    purpose: record.purpose as SheepFlock["purpose"],
    currentCount: record.currentCount as number,
    ramCount: record.ramCount as number,
    eweCount: record.eweCount as number,
    lambCount: record.lambCount as number,
    currentPlotId: (record.currentPlotId as string) || undefined,
    photo: (record.photo as string) || undefined,
    notes: (record.notes as string) || undefined,
    createdAt: record.created as string,
    updatedAt: record.updated as string,
  };
}

function mapLambingRecord(record: Record<string, unknown>): LambingRecord {
  return {
    id: record.id as string,
    flockId: record.flockId as string,
    eweTagId: (record.eweTagId as string) || undefined,
    lambingDate: toISODate(record.lambingDate as string) as string,
    lambsBornAlive: record.lambsBornAlive as number,
    lambsStillborn: record.lambsStillborn as number,
    complications: (record.complications as string) || undefined,
    createdAt: record.created as string,
    updatedAt: record.updated as string,
  };
}

function mapWoolHarvestRecord(record: Record<string, unknown>): WoolHarvestRecord {
  return {
    id: record.id as string,
    flockId: record.flockId as string,
    shearingDate: toISODate(record.shearingDate as string) as string,
    sheepShorn: record.sheepShorn as number,
    totalWeightKg: record.totalWeightKg as number,
    gradeQuality: (record.gradeQuality as WoolHarvestRecord["gradeQuality"]) || undefined,
    buyer: (record.buyer as string) || undefined,
    saleValue: (record.saleValue as WoolHarvestRecord["saleValue"]) || undefined,
    createdAt: record.created as string,
  };
}

function mapMeatOffFlockRecord(record: Record<string, unknown>): MeatOffFlockRecord {
  return {
    id: record.id as string,
    flockId: record.flockId as string,
    date: toISODate(record.date as string) as string,
    animalsSold: record.animalsSold as number,
    totalLiveWeightKg: (record.totalLiveWeightKg as number) || undefined,
    buyer: (record.buyer as string) || undefined,
    saleValue: (record.saleValue as MeatOffFlockRecord["saleValue"]) || undefined,
    createdAt: record.created as string,
  };
}

export async function getSheepFlocks(): Promise<SheepFlock[]> {
  const pb = await getServerPb();
  const records = await pb.collection("sheep_flocks").getFullList({ sort: "flockName" });
  return records.map(mapSheepFlock);
}

export async function getSheepFlockById(id: string): Promise<SheepFlock | null> {
  const pb = await getServerPb();
  try {
    const record = await pb.collection("sheep_flocks").getOne(id);
    return mapSheepFlock(record);
  } catch {
    return null;
  }
}

export async function getLambingRecords(): Promise<LambingRecord[]> {
  const pb = await getServerPb();
  const records = await pb.collection("lambing_records").getFullList({ sort: "-lambingDate" });
  return records.map(mapLambingRecord);
}

export async function getWoolHarvestRecords(): Promise<WoolHarvestRecord[]> {
  const pb = await getServerPb();
  const records = await pb.collection("wool_harvest_records").getFullList({ sort: "-shearingDate" });
  return records.map(mapWoolHarvestRecord);
}

export async function getMeatOffFlockRecords(): Promise<MeatOffFlockRecord[]> {
  const pb = await getServerPb();
  const records = await pb.collection("meat_off_flock_records").getFullList({ sort: "-date" });
  return records.map(mapMeatOffFlockRecord);
}

export type LambingRecordInput = {
  flockId: string;
  lambingDate: string;
  lambsBornAlive: number;
  lambsStillborn: number;
};

export async function createLambingRecord(input: LambingRecordInput): Promise<LambingRecord> {
  const pb = await getServerPb();
  const record = await pb.collection("lambing_records").create(input);
  return mapLambingRecord(record);
}

export type WoolHarvestRecordInput = {
  flockId: string;
  shearingDate: string;
  sheepShorn: number;
  totalWeightKg: number;
  saleValueAmount?: number;
  /** Only used to attribute the linked financial_transactions row when a sale value is provided — not stored on the wool_harvest_records row itself (WoolHarvestRecord has no recordedBy field). */
  recordedBy: string;
};

/**
 * Creates the wool_harvest_records row AND, when a sale value was
 * actually entered, a matching financial_transactions income row —
 * closing the gap flagged in tracker.md's action log (#3): wool/meat
 * sales were captured with a real KES value here but never reached
 * Financials, so the dashboard's sheep income figure silently excluded
 * them. Same "two writes, one logical operation, not atomic" caveat as
 * createHarvestRecord/createStockMovement/upsertMilkLog elsewhere in
 * this codebase — if the second write fails, the wool record itself is
 * still saved and returned; nothing here rolls that back.
 *
 * Deliberately conditional on saleValueAmount being a positive number —
 * a shearing logged with no buyer/price yet (sale_value left blank)
 * stays financially silent, matching "money actually changed hands" as
 * the trigger for a ledger entry, not the physical shearing event alone.
 */
export async function createWoolHarvestRecord(input: WoolHarvestRecordInput): Promise<WoolHarvestRecord> {
  const pb = await getServerPb();
  const { saleValueAmount, recordedBy, ...rest } = input;
  const record = await pb.collection("wool_harvest_records").create({
    ...rest,
    saleValue: saleValueAmount !== undefined ? { amount: saleValueAmount, currency: "KES" } : undefined,
  });
  const wool = mapWoolHarvestRecord(record);

  if (saleValueAmount !== undefined && saleValueAmount > 0) {
    await createTransaction({
      type: "income",
      enterprise: "sheep",
      category: "wool_sale",
      amountValue: saleValueAmount,
      date: input.shearingDate,
      description: `Wool sale — ${input.sheepShorn} sheared, ${input.totalWeightKg} kg`,
      recordedBy,
    });
  }

  return wool;
}

export type MeatOffFlockRecordInput = {
  flockId: string;
  date: string;
  animalsSold: number;
  saleValueAmount?: number;
  /** Only used to attribute the linked financial_transactions row — see WoolHarvestRecordInput's note. */
  recordedBy: string;
};

/** Same sale-linking behavior as createWoolHarvestRecord above, for meat off-take — category "livestock_sale", matching the existing mock data's convention (lib/mock/sheep.ts's MOCK_MEAT_OFFTAKE). */
export async function createMeatOffFlockRecord(input: MeatOffFlockRecordInput): Promise<MeatOffFlockRecord> {
  const pb = await getServerPb();
  const { saleValueAmount, recordedBy, ...rest } = input;
  const record = await pb.collection("meat_off_flock_records").create({
    ...rest,
    saleValue: saleValueAmount !== undefined ? { amount: saleValueAmount, currency: "KES" } : undefined,
  });
  const meat = mapMeatOffFlockRecord(record);

  if (saleValueAmount !== undefined && saleValueAmount > 0) {
    await createTransaction({
      type: "income",
      enterprise: "sheep",
      category: "livestock_sale",
      amountValue: saleValueAmount,
      date: input.date,
      description: `Meat off-take — ${input.animalsSold} sold`,
      recordedBy,
    });
  }

  return meat;
}

export async function getCurrentUserRole(): Promise<UserRole | undefined> {
  const pb = await getServerPb();
  return pb.authStore.isValid ? (pb.authStore.model?.role as UserRole | undefined) : undefined;
}

export async function getCurrentUserId(): Promise<string | undefined> {
  const pb = await getServerPb();
  return pb.authStore.isValid ? (pb.authStore.model?.id as string | undefined) : undefined;
}

export async function updateSheepFlockPhoto(id: string, photoFile: File): Promise<SheepFlock> {
  const pb = await getServerPb();
  const record = await pb.collection("sheep_flocks").update(id, { photo: photoFile });
  return mapSheepFlock(record);
}

export type SheepFlockInput = Omit<SheepFlock, "id" | "createdAt" | "updatedAt" | "photo">;

export async function createSheepFlock(input: SheepFlockInput): Promise<SheepFlock> {
  const pb = await getServerPb();
  const record = await pb.collection("sheep_flocks").create(input);
  return mapSheepFlock(record);
}

export async function updateSheepFlock(id: string, input: Partial<SheepFlockInput>): Promise<SheepFlock> {
  const pb = await getServerPb();
  const record = await pb.collection("sheep_flocks").update(id, input);
  return mapSheepFlock(record);
}
