import { cookies } from "next/headers";
import { createPocketBaseClient } from "@/lib/pb";
import type { Alert } from "@/types/farm";

/** Server-side helper — builds a PocketBase client hydrated from the request's auth cookie. */
async function getServerPb() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("pb_auth")?.value;
  return createPocketBaseClient(authCookie ? `pb_auth=${authCookie}` : undefined);
}

function mapAlert(record: Record<string, unknown>): Alert {
  return {
    id: record.id as string,
    type: record.type as Alert["type"],
    severity: record.severity as Alert["severity"],
    message: record.message as string,
    enterprise: record.enterprise as Alert["enterprise"],
    relatedRecordId: (record.relatedRecordId as string) || undefined,
    createdAt: record.created as string,
    resolvedAt: (record.resolvedAt as string) || undefined,
  };
}

/**
 * Only unresolved alerts — the alerts collection has no delete/archive
 * mechanism (see pb_hooks/alerts.pb.js), so resolved rows stay forever as
 * a history log. Callers wanting the full history should add a separate
 * function rather than overloading this one with a flag.
 */
export async function getOpenAlerts(): Promise<Alert[]> {
  const pb = await getServerPb();
  const records = await pb.collection("alerts").getFullList({
    filter: "resolvedAt = ''",
    sort: "-created",
  });
  return records.map(mapAlert);
}
