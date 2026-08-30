import { cookies } from "next/headers";
import { createPocketBaseClient } from "@/lib/pb";
import type { UserRole } from "@/types/farm";

/** Returns undefined for a guest (no valid session) — callers pass that straight to <Topbar>. */
export async function getSessionUserName(): Promise<string | undefined> {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("pb_auth")?.value;
  const pb = createPocketBaseClient(authCookie ? `pb_auth=${authCookie}` : undefined);
  if (!pb.authStore.isValid) return undefined;
  return (
    (pb.authStore.model?.fullName as string | undefined) ??
    (pb.authStore.model?.email as string | undefined)
  );
}

/**
 * Returns undefined for a guest — used by Sidebar.tsx to filter NAV_ITEMS
 * via canAccessModule(). This check purely decides what to render/link;
 * proxy.ts and each collection's PocketBase rules are the real
 * enforcement, same relationship as canManageCattle() to the cattle
 * collection's own createRule/updateRule.
 */
export async function getSessionRole(): Promise<UserRole | undefined> {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("pb_auth")?.value;
  const pb = createPocketBaseClient(authCookie ? `pb_auth=${authCookie}` : undefined);
  if (!pb.authStore.isValid) return undefined;
  return pb.authStore.model?.role as UserRole | undefined;
}
