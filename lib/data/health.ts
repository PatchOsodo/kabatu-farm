import { cookies } from "next/headers";
import { createPocketBaseClient } from "@/lib/pb";
import type { HealthRecord } from "@/types/farm";

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
