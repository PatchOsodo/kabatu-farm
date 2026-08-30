import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createPocketBaseClient } from "@/lib/pb";
import { canAccessModule, type ModuleKey } from "@/lib/authz";

// "/" is an EXACT match only — the public dashboard summary, nothing else.
// Using startsWith() here would be a bug: every route starts with "/",
// which would make the whole app public. /login is a prefix match since
// it may carry query params (?from=...). /demo (added 2026-08-09) is
// exact — it's a route handler that performs its own auth (see
// app/demo/route.ts) and needs to run BEFORE this middleware's normal
// "no valid session -> redirect to /login" logic would otherwise catch
// it first and never let the auto-login happen at all.
const PUBLIC_EXACT_PATHS = ["/", "/demo"];
const PUBLIC_PREFIX_PATHS = ["/login"];

// Guest-readable enterprise modules — no login required at all. Prefix
// match is intentional: it also covers /dairy/new and /dairy/[id]/edit,
// which is safe ONLY because those specific pages already carry their own
// canManageCattle() redirect guard (see app/dairy/new/page.tsx and
// app/dairy/[id]/edit/page.tsx) — middleware isn't the only thing
// protecting them. Any future create/edit route added under one of these
// four prefixes MUST implement that same page-level guard itself, since
// this middleware will wave it through without checking auth at all.
//
// This also has a data-layer dependency for dairy specifically: the
// `cattle` PocketBase collection's listRule/viewRule were relaxed to
// public in pb_migrations/004_cattle_public_read.js to match. Without
// that migration, a guest reaching /dairy would 500 at the data-fetch
// step instead of rendering — route-level and data-level public access
// have to move together. Sheep/poultry/crops have no real collection yet
// (still mock data), so no equivalent migration is needed for them today.
const GUEST_READABLE_PREFIXES: { prefix: string; moduleKey: ModuleKey }[] = [
  { prefix: "/dairy", moduleKey: "dairy" },
  { prefix: "/sheep", moduleKey: "sheep" },
  { prefix: "/poultry", moduleKey: "poultry" },
  { prefix: "/crops", moduleKey: "crops" },
];

// Sensitive modules — authenticated AND role-checked via canAccessModule.
// A logged-in user with the wrong role is redirected to "/" (they have an
// account, just not this permission) rather than /login (which would
// imply they aren't authenticated, which isn't true).
const ROLE_GATED_PREFIXES: { prefix: string; moduleKey: ModuleKey }[] = [
  { prefix: "/inventory", moduleKey: "inventory" },
  { prefix: "/tasks", moduleKey: "tasks" },
  { prefix: "/financials", moduleKey: "financials" },
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic =
    PUBLIC_EXACT_PATHS.includes(pathname) ||
    PUBLIC_PREFIX_PATHS.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  const guestReadable = GUEST_READABLE_PREFIXES.find((g) => pathname.startsWith(g.prefix));
  if (guestReadable) return NextResponse.next();

  const cookie = request.cookies.get("pb_auth")?.value;
  const pb = createPocketBaseClient(cookie ? `pb_auth=${cookie}` : undefined);

  if (!pb.authStore.isValid) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const roleGated = ROLE_GATED_PREFIXES.find((g) => pathname.startsWith(g.prefix));
  if (roleGated) {
    const role = pb.authStore.model?.role;
    if (!canAccessModule(role, roleGated.moduleKey)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

// The matcher still runs the proxy function for "/" itself (needed so the
// function can decide it's public) — everything else is protected unless
// added to PUBLIC_EXACT_PATHS/PUBLIC_PREFIX_PATHS/GUEST_READABLE_PREFIXES
// above.
//
// manifest.json and sw.js are excluded here too (2026-08-09 fix) — these
// are static PWA assets (see public/manifest.json, public/sw.js) that
// must be fetchable with NO auth state at all: a service worker
// registering for the first time, or a browser whose pb_auth cookie
// expired while the device was genuinely offline for a while, would
// otherwise get a 307 redirect to /login instead of the actual file —
// confirmed via a real test (200 with a valid cookie, 307 without one).
export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico|manifest.json|sw.js).*)"],
};
