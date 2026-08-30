import { Topbar } from "@/components/layout/Topbar";
import { SheepTabs } from "@/components/livestock/SheepTabs";
import { ViewLink, LinkButton } from "@/components/ui/Button";
import { getSheepFlocks, getCurrentUserRole } from "@/lib/data/sheep";
import { getHealthRecords } from "@/lib/data/health";
import { getActiveQuarantine } from "@/lib/quarantine";
import { canManageSheep } from "@/lib/authz";
import { getSessionUserName } from "@/lib/session";

const PURPOSE_LABEL: Record<string, string> = {
  wool: "Wool",
  meat: "Meat",
  dual_purpose: "Dual purpose",
  breeding_stock: "Breeding stock",
};

export default async function SheepFlocksPage() {
  const [flocks, healthRecords, role, activeUserName] = await Promise.all([
    getSheepFlocks(),
    getHealthRecords(),
    getCurrentUserRole(),
    getSessionUserName(),
  ]);
  const totalHead = flocks.reduce((sum, f) => sum + f.currentCount, 0);

  return (
    <>
      <Topbar activeUserName={activeUserName} />
      <main className="flex-1 px-6 md:px-10 py-8">
        <SheepTabs />

        <div className="flex items-baseline justify-between mb-4">
          <p className="text-sm text-ink-500">
            {flocks.length} flocks · <span className="font-mono-data text-ink-900">{totalHead}</span> head total
          </p>
          {canManageSheep(role) && (
            <LinkButton href="/sheep/new" variant="primary" size="sm">
              + Add flock
            </LinkButton>
          )}
        </div>

        <div className="border border-line rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-parchment-100/70 text-left text-ink-500 text-xs uppercase tracking-wide">
                <th className="px-4 py-2.5 font-medium">Flock</th>
                <th className="px-4 py-2.5 font-medium">Breed</th>
                <th className="px-4 py-2.5 font-medium">Purpose</th>
                <th className="px-4 py-2.5 font-medium text-right">Rams</th>
                <th className="px-4 py-2.5 font-medium text-right">Ewes</th>
                <th className="px-4 py-2.5 font-medium text-right">Lambs</th>
                <th className="px-4 py-2.5 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {flocks.map((f) => {
                const quarantine = getActiveQuarantine(healthRecords, f.id);
                return (
                  <tr key={f.id} className="border-t border-line hover:bg-parchment-100/40">
                    <td className="px-4 py-2.5">
                      <ViewLink href={`/sheep/${f.id}`}>{f.flockName}</ViewLink>
                      {quarantine && (
                        <span
                          className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-danger text-white"
                          title={`Quarantined until ${quarantine.quarantineUntilDate}`}
                        >
                          Quarantined
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-ink-700">{f.breed}</td>
                    <td className="px-4 py-2.5 text-ink-700">{PURPOSE_LABEL[f.purpose]}</td>
                    <td className="px-4 py-2.5 text-right font-mono-data text-ink-900">{f.ramCount}</td>
                    <td className="px-4 py-2.5 text-right font-mono-data text-ink-900">{f.eweCount}</td>
                    <td className="px-4 py-2.5 text-right font-mono-data text-ink-900">{f.lambCount}</td>
                    <td className="px-4 py-2.5 text-right font-mono-data text-ink-900 font-medium">
                      {f.currentCount}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
