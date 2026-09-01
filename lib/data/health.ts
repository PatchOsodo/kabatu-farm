import { cookies } from "next/headers";
import { createPocketBaseClient } from "@/lib/pb";
import { createTransaction } from "@/lib/data/financials";
import type { Enterprise, HealthRecord, UserRole } from "@/types/farm";

async function getServerPb() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("pb_auth")?.value;
  return createPocketBaseClient(authCookie ? `pb_auth=${authCookie}` : undefined);
}

// Same date-normalization requirement as every other module —
// PocketBase returns date fields as full timestamps, not the plain
// YYYY-MM-DD the ISODate type promises.
function toISODate(value: string | undefined | null): string | undefined {
  return value ? value.slice(0, 10) : undefined;
}

function mapHealthRecord(record: Record<string, unknown>): HealthRecord {
  return {
    id: record.id as string,
    animalId: record.animalId as string,
    animalType: record.animalType as HealthRecord["animalType"],
    eventType: record.eventType as HealthRecord["eventType"],
    date: toISODate(record.date as string) as string,
    diagnosis: (record.diagnosis as string) || undefined,
    medicineUsed: (record.medicineUsed as string) || undefined,
    dosage: (record.dosage as string) || undefined,
    administeredBy: (record.administeredBy as string) || undefined,
    withdrawalPeriodEndsOn: toISODate(record.withdrawalPeriodEndsOn as string),
    // Previously never mapped despite existing on both the type
    // (types/farm.ts) and the PocketBase schema (010_health_feed.js) —
    // any cost stored on a health record was silently dropped on every
    // read. Fixed as part of wiring cost through to Financials.
    cost: (record.cost as HealthRecord["cost"]) || undefined,
    followUpDate: toISODate(record.followUpDate as string),
    notes: (record.notes as string) || undefined,
    withdrawalDaysMilk: (record.withdrawalDaysMilk as number) || undefined,
    withdrawalDaysMeat: (record.withdrawalDaysMeat as number) || undefined,
    quarantineUntilDate: toISODate(record.quarantineUntilDate as string),
    createdAt: record.created as string,
    updatedAt: record.updated as string,
  };
}

export async function getHealthRecords(): Promise<HealthRecord[]> {
  const pb = await getServerPb();
  const records = await pb.collection("health_records").getFullList({ sort: "-date" });
  return records.map(mapHealthRecord);
}

// animalType -> Enterprise, for attributing the linked financial_transactions
// expense row to the right enterprise. poultry_flock maps to "poultry";
// the other two map 1:1 by name already.
const ANIMAL_TYPE_ENTERPRISE: Record<HealthRecord["animalType"], Enterprise> = {
  cattle: "dairy",
  sheep: "sheep",
  poultry_flock: "poultry",
};

const EVENT_TYPE_LABEL: Record<HealthRecord["eventType"], string> = {
  vaccination: "Vaccination",
  treatment: "Treatment",
  deworming: "Deworming",
  checkup: "Checkup",
  injury: "Injury",
  illness: "Illness",
};

export type HealthRecordInput = {
  animalId: string;
  animalType: HealthRecord["animalType"];
  eventType: HealthRecord["eventType"];
  date: string;
  diagnosis?: string;
  medicineUsed?: string;
  dosage?: string;
  administeredBy?: string;
  withdrawalPeriodEndsOn?: string;
  followUpDate?: string;
  notes?: string;
  withdrawalDaysMilk?: number;
  withdrawalDaysMeat?: number;
  quarantineUntilDate?: string;
  costAmount?: number;
  /** Only used to attribute the linked financial_transactions row when a cost was entered — not stored on health_records itself, which has no recordedBy field. */
  recordedBy: string;
};

/**
 * Creates the health_records row AND, when a cost was actually entered,
 * a matching financial_transactions EXPENSE row — the mirror-image of
 * createWoolHarvestRecord/createMeatOffFlockRecord (lib/data/sheep.ts)
 * and createStockMovement's sale-linking (lib/data/inventory.ts), which
 * cover the income side. A vet treatment/vaccination with a real KES
 * cost previously had nowhere to reach Financials at all — this closes
 * that on the expense side, closing out tracker.md's item #8.
 *
 * Same "two writes, one logical operation, not atomic" caveat as every
 * other multi-write function in this codebase: a failure on the second
 * (financial_transactions) write doesn't roll back the health record
 * itself.
 *
 * Category is always "medicine_vet" — the one ExpenseCategory value
 * that unambiguously fits every HealthRecord.eventType (vaccination,
 * treatment, deworming, checkup, injury, illness are all clinical
 * care), so no further branching is needed the way sales needed to pick
 * between wool_sale/livestock_sale/milk_sale/egg_sale.
 */
export async function createHealthRecord(input: HealthRecordInput): Promise<HealthRecord> {
  const pb = await getServerPb();
  const { costAmount, recordedBy, ...rest } = input;

  const record = await pb.collection("health_records").create({
    ...rest,
    cost: costAmount !== undefined ? { amount: costAmount, currency: "KES" } : undefined,
  });
  const healthRecord = mapHealthRecord(record);

  if (costAmount !== undefined && costAmount > 0) {
    await createTransaction({
      type: "expense",
      enterprise: ANIMAL_TYPE_ENTERPRISE[input.animalType],
      category: "medicine_vet",
      amountValue: costAmount,
      date: input.date,
      description: `${EVENT_TYPE_LABEL[input.eventType]}${input.diagnosis ? ` — ${input.diagnosis}` : ""}`,
      recordedBy,
    });
  }

  return healthRecord;
}

export async function getCurrentUserRole(): Promise<UserRole | undefined> {
  const pb = await getServerPb();
  return pb.authStore.isValid ? (pb.authStore.model?.role as UserRole | undefined) : undefined;
}

export async function getCurrentUserId(): Promise<string | undefined> {
  const pb = await getServerPb();
  return pb.authStore.isValid ? (pb.authStore.model?.id as string | undefined) : undefined;
}
