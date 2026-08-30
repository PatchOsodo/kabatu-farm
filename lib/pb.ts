import PocketBase from "pocketbase";
import type { UserRole, Enterprise } from "@/types/farm";

// One shared client. In the browser it persists the auth token to
// localStorage automatically; on the server, pass a fresh instance per
// request (e.g. in middleware) and hydrate auth from a cookie.
//
// URL selection matters here in a way that isn't obvious until you hit it:
// NEXT_PUBLIC_POCKETBASE_URL is inlined as a literal string at Docker BUILD
// time — by every code path that references it, server-side included, since
// Next.js's compiler can't tell "this happens to run in Node" from "this is
// client code." That value is correctly the PUBLIC URL (the browser has to
// reach it directly for login/realtime) — which means it's WRONG for
// server-side calls running inside the nextjs container, where "public URL"
// means routing back out through the internet (or, worse, resolving to the
// container's own loopback if the value is a bare 127.0.0.1). Server-side
// calls should instead go straight across the Docker Compose network via
// POCKETBASE_INTERNAL_URL (http://pocketbase:8090 — the compose service
// name, not the host-mapped port). That var is intentionally NOT prefixed
// with NEXT_PUBLIC_, so Next.js leaves it as a genuine runtime process.env
// read on the server, instead of baking it in at build time.
export function createPocketBaseClient(cookieAuthStore?: string) {
  const isServer = typeof window === "undefined";
  const url = isServer
    ? process.env.POCKETBASE_INTERNAL_URL || process.env.NEXT_PUBLIC_POCKETBASE_URL
    : process.env.NEXT_PUBLIC_POCKETBASE_URL;

  const pb = new PocketBase(url);
  if (cookieAuthStore) {
    pb.authStore.loadFromCookie(cookieAuthStore);
  }
  return pb;
}

export interface FarmAuthUser {
  id: string;
  email: string;
  username?: string;
  fullName: string;
  role: UserRole;
  enterprises: Enterprise[];
}

/**
 * Client-side login. Call from the /login form. Sets a cookie afterward
 * so proxy.ts (which runs server-side and can't see localStorage) can
 * also recognize the session.
 *
 * `identity` can be either the account's email OR username — PocketBase
 * checks it against whichever fields are listed in the `users` collection's
 * passwordAuth.identityFields config (see pb_migrations/005_users_username_field.js),
 * currently ["email", "username"]. This function doesn't need to know or
 * care which one the person typed.
 */
export async function login(identity: string, password: string): Promise<FarmAuthUser> {
  const pb = createPocketBaseClient();
  const { record } = await pb.collection("users").authWithPassword(identity, password);

  document.cookie = pb.authStore.exportToCookie({
    httpOnly: false, // client JS has to be able to set it; see note in middleware.ts
    secure: true,
    sameSite: "lax",
    path: "/",
  });

  return {
    id: record.id,
    email: record.email,
    username: record.username || undefined,
    fullName: record.fullName ?? record.username ?? record.email,
    role: record.role,
    enterprises: record.enterprises ?? [],
  };
}

export function logout() {
  const pb = createPocketBaseClient();
  pb.authStore.clear();
  document.cookie = "pb_auth=; Max-Age=0; path=/";
}

/**
 * Builds the browser-accessible URL for a PocketBase native file field
 * (e.g. Cattle.photoUrl, SheepFlock.photo, PoultryFlock.photo). These
 * fields store only the filename in the record's JSON — this constructs
 * the actual /api/files/... URL. Uses pb.getFileUrl(), the method name in
 * the SDK version this project pins (^0.21.5) — note newer SDK majors
 * renamed this to pb.files.getURL(), don't "helpfully" update it without
 * also bumping the pinned dependency.
 *
 * Deliberately does NOT go through createPocketBaseClient()'s
 * server/client URL branching. The URL this returns always ends up
 * rendered into an <img src> that the BROWSER fetches — including when
 * this function itself executes server-side, e.g. during SSR of an async
 * Server Component. Using createPocketBaseClient() here would pick
 * POCKETBASE_INTERNAL_URL (http://pocketbase:8090, only resolvable
 * inside the Docker network) whenever called from server code, producing
 * a URL the browser can never reach — a silent, environment-dependent
 * bug that would only show up in production. Always use the public URL.
 *
 * Returns undefined if there's no file set, so callers can do
 * `getFileUrl(...) ?? <placeholder>` without a null check dance.
 */
export function getFileUrl(
  collectionIdOrName: string,
  recordId: string,
  filename: string | undefined | null
): string | undefined {
  if (!filename) return undefined;
  const pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL);
  return pb.getFileUrl({ collectionId: collectionIdOrName, id: recordId }, filename);
}

// Example: swap-in replacement for the dairy mock data.
// import { createPocketBaseClient } from "@/lib/pb";
// import type { Cattle } from "@/types/farm";
//
// export async function getCattleList(): Promise<Cattle[]> {
//   const pb = createPocketBaseClient();
//   const records = await pb.collection("cattle").getFullList({ sort: "tagId" });
//   return records as unknown as Cattle[];
// }
