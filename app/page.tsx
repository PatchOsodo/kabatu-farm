import { Topbar } from "@/components/layout/Topbar";
import { ENTERPRISE_LABEL } from "@/lib/modules";
import { getSessionUserName } from "@/lib/session";
import { getFarmDashboardData } from "@/lib/data/dashboard";

function money(amount: number) {
  return `KES ${amount.toLocaleString("en-KE")}`;
}

export default async function DashboardPage() {
  const data = await getFarmDashboardData();
  const totalOpenAlerts = data.enterprises.reduce((sum, e) => sum + e.openAlerts, 0);

  // "/" is the one public route (see proxy.ts) — check auth explicitly
  // here rather than assuming a logged-in user, since guests reach this
  // page too. Only affects what Topbar renders (avatar vs Log in CTA);
  // this page has no edit affordances to begin with, so nothing else
  // needs to change for the guest case.
  const activeUserName = await getSessionUserName();
  const isAuthenticated = Boolean(activeUserName);

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

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {data.enterprises.map((e) => {
            const net = e.monthIncome.amount - e.monthExpense.amount;
            return (
              <article
                key={e.enterprise}
                className="relative bg-parchment-100/60 border border-line rounded p-5 flex flex-col gap-4"
              >
                <span className="absolute top-0 left-5 -translate-y-1/2 h-1 w-8 bg-gold-500 rounded-full" />

                <div>
                  <h2 className="font-display text-lg text-ink-900">
                    {ENTERPRISE_LABEL[e.enterprise]}
                  </h2>
                  <p className="text-xs text-ink-500 mt-0.5">{e.headline}</p>
                </div>

                <dl className="text-xs font-mono-data space-y-1.5">
                  <div className="flex justify-between">
                    <dt className="text-ink-500">Income (MTD)</dt>
                    <dd className="text-ink-900">{money(e.monthIncome.amount)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ink-500">Expense (MTD)</dt>
                    <dd className="text-ink-900">{money(e.monthExpense.amount)}</dd>
                  </div>
                  <div className="flex justify-between border-t border-line pt-1.5 mt-1.5">
                    <dt className="text-ink-500">Net</dt>
                    <dd className={net >= 0 ? "text-forest-700" : "text-danger"}>
                      {net >= 0 ? "+" : ""}
                      {money(net)}
                    </dd>
                  </div>
                </dl>

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
