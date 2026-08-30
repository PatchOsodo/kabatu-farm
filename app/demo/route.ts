import { cookies } from "next/headers";
import { createPocketBaseClient } from "@/lib/pb";

/**
 * One-off demo entry point (2026-08-09): visiting /demo silently
 * authenticates as a real seeded PocketBase user and drops the person
 * straight onto the dashboard, no login screen.
 *
 * Deliberately NOT "remove auth" — this app is already live on a public
 * domain, and disabling PocketBase's collection-level auth rules would
 * mean anyone who finds the URL can read/write everything indefinitely,
 * not just during a controlled walkthrough. Instead this authenticates
 * as a normal, fully-permissioned user (should be seeded with role
 * "owner" for full read+write access everywhere) — every existing
 * PocketBase rule stays exactly as protected as it already is.
 *
 * Only active when DEMO_USERNAME/DEMO_PASSWORD are set as real env vars
 * — this is the "I control when it's exposed" mechanism the person
 * asked for. Unset (the default), this route just bounces to /login
 * like any other unauthenticated request would. Set them only for the
 * walkthrough, then remove them and restart the container afterward.
 *
 * IMPORTANT: any cattle/milk logs/etc. entered during the demo are REAL
 * records in the SAME database — this doesn't sandbox writes. Plan to
 * delete the demo user's records afterward if you don't want them
 * showing up in the real farm data.
 *
 * IMPORTANT (fixed 2026-08-09, found via real deployment testing behind
 * nginx): redirects here use plain RELATIVE Location headers ("/",
 * "/login"), not `new URL(path, request.url)`. Behind the reverse proxy,
 * `request.url` reflects Next.js's own internal bind address (e.g.
 * http://0.0.0.0:3000/demo), not the public domain — nginx doesn't
 * rewrite that unless explicitly configured to forward and Next.js is
 * told to trust X-Forwarded-Host/Proto, which this deployment doesn't
 * do. Building an absolute URL from request.url sent the browser to an
 * unreachable internal address instead of back to the real site. A
 * relative Location header sidesteps this entirely — the BROWSER
 * resolves it against whatever address is actually in its own address
 * bar, not anything Next.js thinks its own host is.
 */
function redirectTo(path: string): Response {
  return new Response(null, { status: 307, headers: { Location: path } });
}

export async function GET() {
  const demoUsername = process.env.DEMO_USERNAME;
  const demoPassword = process.env.DEMO_PASSWORD;

  if (!demoUsername || !demoPassword) {
    return redirectTo("/login");
  }

  const pb = createPocketBaseClient();
  try {
    await pb.collection("users").authWithPassword(demoUsername, demoPassword);
  } catch {
    return redirectTo("/login");
  }

  // Deliberately NOT using pb.authStore.exportToCookie()'s string output
  // directly — that method both JSON-serializes AND percent-encodes the
  // payload in one step, and Next's cookies().set() also encodes on
  // write, risking silent double-encoding. Instead: build the exact same
  // { token, model } shape exportToCookie() uses internally (confirmed
  // by reading the SDK source), hand the raw JSON to Next's cookie API,
  // and let it encode exactly once — matching how session.ts/proxy.ts
  // read it back (Next decodes exactly once on the way out). Verified
  // end-to-end against a real server rather than assumed.
  const payload = JSON.stringify({ token: pb.authStore.token, model: pb.authStore.model });
  const cookieStore = await cookies();
  cookieStore.set("pb_auth", payload, {
    path: "/",
    httpOnly: false, // matches the normal login() flow — see lib/pb.ts
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  return redirectTo("/");
}
