"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button, LinkButton } from "@/components/ui/Button";
import { logout } from "@/lib/pb";

interface TopbarProps {
  /** Undefined/omitted means "guest" — renders a Log in CTA instead of a user avatar. */
  activeUserName?: string;
  openAlertCount?: number;
}

export function Topbar({ activeUserName, openAlertCount = 0 }: TopbarProps) {
  const isGuest = !activeUserName;
  const router = useRouter();

  function handleLogout() {
    logout();
    // The dashboard is guest-viewable, so land there rather than /login —
    // refresh() re-runs the server components (getSessionUserName() etc.)
    // against the now-cleared cookie, otherwise stale authed content could
    // briefly stick around from Next's router cache.
    router.push("/");
    router.refresh();
  }

  const today = new Date().toLocaleDateString("en-KE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="flex items-center justify-between px-4 md:px-10 py-4 border-b border-line bg-parchment-50">
    <div>
    <p className="font-display text-lg text-ink-900">Farm Overview</p>
    <p className="text-xs text-ink-500 font-mono-data hidden sm:block">{today}</p>
    </div>

    <div className="flex items-center gap-3 md:gap-5">
    {openAlertCount > 0 && (
      <span className="text-xs font-mono-data px-2 md:px-2.5 py-1 rounded border border-danger/30 text-danger bg-danger/5">
      {openAlertCount} <span className="hidden sm:inline">open alert{openAlertCount === 1 ? "" : "s"}</span>
      </span>
    )}
    <div className="flex items-center gap-2">
    {isGuest ? (
      <>
      <span className="text-xs text-ink-500 hidden sm:inline">Viewing as guest</span>
      <LinkButton href="/login" variant="primary" size="sm">
      Log in
      </LinkButton>
      </>
    ) : (
      <>
      <span className="h-7 w-7 rounded-full bg-forest-800 text-parchment-50 text-xs flex items-center justify-center font-display">
      {activeUserName.charAt(0)}
      </span>
      <span className="text-sm text-ink-900 hidden sm:inline">{activeUserName}</span>
      <Button onClick={handleLogout} variant="ghost" size="sm">
      Log out
      </Button>
      </>
    )}
    </div>
    </div>
    </header>
  );
}
