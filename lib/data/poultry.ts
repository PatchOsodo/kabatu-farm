import { cookies } from "next/headers";
import { createPocketBaseClient } from "@/lib/pb";
import type { EggCollectionLog, PoultryFlock, PoultryMortalityLog, UserRole } from "@/types/farm";

/** Server-side helper — builds a PocketBase client hydrated from the request's auth cookie. */
async function getServerPb() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("pb_auth")?.value;
  return createPocketBaseClient(authCookie ? `pb_auth=${authCookie}` : undefined);
}

// See lib/data/dairy-records.ts's toISODate for why this normalization
// exists — PocketBase's full-timestamp date storage vs. the plain
// YYYY-MM-DD the ISODate type promises.
function toISODate(value: string | undefined | null): string | undefined {
  return value ? value.slice(0, 10) : undefined;
}

function mapPoultryFlock(record: Record<string, unknown>): PoultryFlock {
  return {
    id: record.id as string,
    flockName: record.flockName as string,
    type: record.type as PoultryFlock["type"],
    breed: record.breed as string,
    housingLocation: record.housingLocation as string,
    currentBirdCount: record.currentBirdCount as number,
    dateAcquired: toISODate(record.dateAcquired as string) as string,
    sourceType: record.sourceType as PoultryFlock["sourceType"],
    ageWeeksAtAcquisition: (record.ageWeeksAtAcquisition as number) ?? undefined,
    status: record.status as PoultryFlock["status"],
    photo: (record.photo as string) || undefined,
    createdAt: record.created as string,
    updatedAt: record.updated as string,
  };
}

function mapEggCollectionLog(record: Record<string, unknown>): EggCollectionLog {
  return {
    id: record.id as string,
    flockId: record.flockId as string,
    date: toISODate(record.date as string) as string,
    eggsCollected: record.eggsCollected as number,
    eggsBroken: record.eggsBroken as number,
    eggsGraded: (record.eggsGraded as EggCollectionLog["eggsGraded"]) || undefined,
    recordedBy: record.recordedBy as string,
    createdAt: record.created as string,
  };
}

function mapPoultryMortalityLog(record: Record<string, unknown>): PoultryMortalityLog {
  return {
    id: record.id as string,
    flockId: record.flockId as string,
    date: toISODate(record.date as string) as string,
    birdsLost: record.birdsLost as number,
    suspectedCause: (record.suspectedCause as string) || undefined,
    notes: (record.notes as string) || undefined,
    createdAt: record.created as string,
  };
}

export async function getPoultryFlocks(): Promise<PoultryFlock[]> {
  const pb = await getServerPb();
  const records = await pb.collection("poultry_flocks").getFullList({ sort: "flockName" });
  return records.map(mapPoultryFlock);
}

export async function getPoultryFlockById(id: string): Promise<PoultryFlock | null> {
  const pb = await getServerPb();
  try {
    const record = await pb.collection("poultry_flocks").getOne(id);
    return mapPoultryFlock(record);
  } catch {
    return null;
  }
}

export async function getEggCollectionLogs(): Promise<EggCollectionLog[]> {
  const pb = await getServerPb();
  const records = await pb.collection("egg_collection_logs").getFullList({ sort: "-date" });
  return records.map(mapEggCollectionLog);
}

export async function getPoultryMortalityLogs(): Promise<PoultryMortalityLog[]> {
  const pb = await getServerPb();
  const records = await pb.collection("poultry_mortality_logs").getFullList({ sort: "-date" });
  return records.map(mapPoultryMortalityLog);
}

export type EggLogInput = {
  flockId: string;
  date: string;
  eggsCollected: number;
  eggsBroken: number;
  recordedBy: string;
};

/**
 * One egg_collection_logs row per (flockId, date) — EggLogView edits
 * "collected" and "broken" as two cells of the same logical row, so this
 * upserts both fields together rather than field-by-field. Same day-range
 * filter approach as upsertMilkLog in lib/data/dairy-records.ts, for the
 * same reason (exact string equality against the stored full timestamp
 * silently matches nothing).
 */
export async function upsertEggLog(input: EggLogInput): Promise<EggCollectionLog> {
  const pb = await getServerPb();

  const dayStart = `${input.date} 00:00:00`;
  const nextDay = new Date(input.date);
  nextDay.setDate(nextDay.getDate() + 1);
  const dayEnd = `${nextDay.toISOString().slice(0, 10)} 00:00:00`;

  const existing = await pb.collection("egg_collection_logs").getFullList({
    filter: `flockId = "${input.flockId}" && date >= "${dayStart}" && date < "${dayEnd}"`,
  });

  if (existing.length > 0) {
    const record = await pb.collection("egg_collection_logs").update(existing[0].id, {
      eggsCollected: input.eggsCollected,
      eggsBroken: input.eggsBroken,
      recordedBy: input.recordedBy,
    });
    return mapEggCollectionLog(record);
  }

  const record = await pb.collection("egg_collection_logs").create(input);
  return mapEggCollectionLog(record);
}

export async function getCurrentUserRole(): Promise<UserRole | undefined> {
  const pb = await getServerPb();
  return pb.authStore.isValid ? (pb.authStore.model?.role as UserRole | undefined) : undefined;
}

export async function getCurrentUserId(): Promise<string | undefined> {
  const pb = await getServerPb();
  return pb.authStore.isValid ? (pb.authStore.model?.id as string | undefined) : undefined;
}

export async function updatePoultryFlockPhoto(id: string, photoFile: File): Promise<PoultryFlock> {
  const pb = await getServerPb();
  const record = await pb.collection("poultry_flocks").update(id, { photo: photoFile });
  return mapPoultryFlock(record);
}

export type PoultryFlockInput = Omit<PoultryFlock, "id" | "createdAt" | "updatedAt" | "photo">;

export async function createPoultryFlock(input: PoultryFlockInput): Promise<PoultryFlock> {
  const pb = await getServerPb();
  const record = await pb.collection("poultry_flocks").create(input);
  return mapPoultryFlock(record);
}

export async function updatePoultryFlock(id: string, input: Partial<PoultryFlockInput>): Promise<PoultryFlock> {
  const pb = await getServerPb();
  const record = await pb.collection("poultry_flocks").update(id, input);
  return mapPoultryFlock(record);
}
