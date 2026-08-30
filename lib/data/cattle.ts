import { cookies } from "next/headers";
import { createPocketBaseClient } from "@/lib/pb";
import type { Cattle, UserRole } from "@/types/farm";

/** Server-side helper — builds a PocketBase client hydrated from the request's auth cookie. */
async function getServerPb() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("pb_auth")?.value;
  return createPocketBaseClient(authCookie ? `pb_auth=${authCookie}` : undefined);
}

export async function getCattleList(): Promise<Cattle[]> {
  const pb = await getServerPb();
  const records = await pb.collection("cattle").getFullList({ sort: "tagId" });
  return records as unknown as Cattle[];
}

export async function getCattleById(id: string): Promise<Cattle | null> {
  const pb = await getServerPb();
  try {
    const record = await pb.collection("cattle").getOne(id);
    return record as unknown as Cattle;
  } catch {
    return null; // 404 from PocketBase — let the caller decide (usually notFound())
  }
}

export type CattleInput = Omit<Cattle, "id" | "createdAt" | "updatedAt" | "photoUrl">;

export async function createCattle(input: CattleInput, photoFile?: File | null): Promise<Cattle> {
  const pb = await getServerPb();
  const body = photoFile ? { ...input, photoUrl: photoFile } : input;
  const record = await pb.collection("cattle").create(body);
  return record as unknown as Cattle;
}

export async function updateCattle(id: string, input: Partial<CattleInput>, photoFile?: File | null): Promise<Cattle> {
  const pb = await getServerPb();
  const body = photoFile ? { ...input, photoUrl: photoFile } : input;
  const record = await pb.collection("cattle").update(id, body);
  return record as unknown as Cattle;
}

/** Current user's role, for the canManageCattle() check on list/detail pages. */
export async function getCurrentUserRole(): Promise<UserRole | undefined> {
  const pb = await getServerPb();
  return pb.authStore.isValid ? (pb.authStore.model?.role as UserRole | undefined) : undefined;
}
