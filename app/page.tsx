import { Topbar } from "@/components/layout/Topbar";
import { LinkButton } from "@/components/ui/Button";
import { ENTERPRISE_LABEL } from "@/lib/modules";
import { getSessionUserName, getSessionRole } from "@/lib/session";
import { getFarmDashboardData } from "@/lib/data/dashboard";
import {
  canManageMilkLogs,
  canManagePoultry,
  canManageFinancials,
  canCreateTask,
  canManageCattle,
  canManageSheep,
  canManageLandParcels,
} from "@/lib/authz";
import type { Enterprise, UserRole } from "@/types/farm";

function money(amount: number) {
  return `KES ${amount.toLocaleString("en-KE")}`;
}

interface QuickAction {
  key: string;
  label: string;
  href: string;
  glyph: string;
}

interface AddConfigEntry {
  href: string;
  label: string;
  canAdd: (role: UserRole | undefined) => boolean;
}

// Per-enterprise "add a first record" destination for the empty-state
// card — mirrors each module's own /new route and reuses the exact same
// permission check that route itself already enforces (see
// app/dairy/new/page.tsx, app/sheep/new/page.tsx,
// app/poultry/new/page.tsx, app/crops/new/page.tsx), so this is UI
// convenience only, not a second access layer.
const ADD_CONFIG: Record<Enterprise, AddConfigEntry> = {
  dairy: { href: "/dairy/new", label: "cattle", canAdd: canManageCattle },
  sheep: { href: "/sheep/new", label: "flock", canAdd: canManageSheep },
  poultry: { href: "/poultry/new", label: "flock", canAdd: canManagePoultry },
  crops: { href: "/crops/new", label: "plot", canAdd: canManageLandParcels },
};

export default async function DashboardPage() {
  const data = await getFarmDashboardData();
  const totalOpenAlerts = data.enterprises.reduce((sum, e) => sum + e.openAlerts, 0);

  // "/" is the one public route (see proxy.ts) — check auth explicitly
  // here rather than assuming a logged-in user, since guests reach this
  // page too. Only affects what Topbar renders (avatar vs Log in CTA);
  // this page has no edit affordances to begin with, so nothing else
  // needs to change for the guest case.
  const [activeUserName, role] = await Promise.all([getSessionUserName(), getSessionRole()]);
  const isAuthenticated = Boolean(activeUserName);

  // Quick actions — direct links into each module's existing entry
  // point, gated by the same role checks each destination page already
  // enforces itself (this is a UI convenience only, not a second access
  // control layer; see lib/authz.ts's own comments on this pattern).
  // A guest or under-permissioned role simply sees fewer/no actions,
  // same as Sidebar/BottomNav already do for nav items.
  const quickActions: QuickAction[] = [
    canManageMilkLogs(role) && { key: "milk", label: "Log milk", href: "/dairy/milk-log/entry", glyph: "🥛" },
    canManagePoultry(role) && { key: "eggs", label: "Log eggs", href: "/poultry/egg-log", glyph: "🥚" },
    canManageFinancials(role) && { key: "expense", label: "Add expense", href: "/financials/transactions", glyph: "◈" },
    canCreateTask(role) && { key: "task", label: "Add task", href: "/tasks", glyph: "☑" },
  ].filter((a): a is QuickAction => Boolean(a));

  return (
    <>
    <Topbar activeUserName={activeUserName} openAlertCount={isAuthenticated ? totalOpenAlerts : 0} />

    <main className="flex-1 px-6 md:px-10 py-8">
    {/* Signature element: the ledger tally strip — a single running row of
      headline stats, rule-separated, standing in for a "hero" on a
      data app rather than decorative imagery. */}
      <div className="flex flex-wrap gap-x-8 gap-y-3 pb-6 mb-8 border-b border-line font-mono-data text-sm">
      {data.enterprises.map((e) => (
        <div key={e.enterprise} className="flex items-baseline gap-2">
        <span className="text-ink-500 uppercase tracking-wide text-[11px]">
        {ENTERPRISE_LABEL[e.enterprise]}
        </span>
        <span className="text-ink-900">{e.todayOutput ?? "—"}</span>
        </div>
      ))}
      </div>

      {quickActions.length > 0 && (
        <section className="flex flex-wrap gap-3 mb-8">
        {quickActions.map((a) => (
          <LinkButton key={a.key} href={a.href} variant="primary" size="sm">
          {a.glyph} {a.label}
          </LinkButton>
        ))}
        </section>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
      {data.enterprises.map((e) => {
        const net = e.monthIncome.amount - e.monthExpense.amount;
        const addConfig = ADD_CONFIG[e.enterprise];
        const showEmptyState = !e.hasRecords;

        return (
          <article
          key={e.enterprise}
          className="relative bg-parchment-100/60 border border-line rounded p-5 flex flex-col gap-3"
          >
          <span className="absolute top-0 left-5 -translate-y-1/2 h-1 w-8 bg-gold-500 rounded-full" />

          <div>
          <h2 className="font-display text-lg text-ink-900">
          {ENTERPRISE_LABEL[e.enterprise]}
          </h2>
          <p className="text-xs text-ink-500 mt-0.5">{e.headline}</p>
          </div>

          {showEmptyState ? (
            // True empty state — zero underlying records, so a
            // KES 0 net is genuinely accurate (nothing to show
            // yet), not a figure hiding un-recorded activity.
            <div className="flex flex-col gap-2">
            <p className="text-sm text-ink-500">
            No {ENTERPRISE_LABEL[e.enterprise].toLowerCase()} activity yet.
            </p>
            {addConfig.canAdd(role) && (
              <LinkButton href={addConfig.href} variant="secondary" size="sm">
              + Add {addConfig.label}
              </LinkButton>
            )}
            </div>
          ) : (
            <>
            {/* Net shown first and largest — the answer, not a supporting
              figure, per the reviewer's hierarchy note: income/expense
              are context for the net, not co-equal with it. */}
              <p className={`font-display text-2xl ${net >= 0 ? "text-forest-700" : "text-danger"}`}>
              {net >= 0 ? "+" : ""}
              {money(net)}
              <span className="font-body text-[11px] text-ink-500 ml-1.5">net this month</span>
              </p>

              <dl className="text-[11px] font-mono-data text-ink-500 flex gap-4">
              <div className="flex items-baseline gap-1">
              <dt>Income</dt>
              <dd className="text-ink-700">{money(e.monthIncome.amount)}</dd>
              </div>
              <div className="flex items-baseline gap-1">
              <dt>Expenses</dt>
              <dd className="text-ink-700">{money(e.monthExpense.amount)}</dd>
              </div>
              </dl>
              </>
          )}

          {e.openAlerts > 0 && (
            <p className="text-[11px] text-danger">
            {e.openAlerts} alert{e.openAlerts === 1 ? "" : "s"} needs attention
            </p>
          )}
          </article>
        );
      })}
      </div>
      </main>
      </>
  );
}
