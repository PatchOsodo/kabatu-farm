import { Topbar } from "@/components/layout/Topbar";
import { DairyTabs } from "@/components/dairy/DairyTabs";
import { CattleTable } from "@/components/dairy/CattleTable";
import { LinkButton } from "@/components/ui/Button";
import { getCattleList, getCurrentUserRole } from "@/lib/data/cattle";
import { getLactationCycles } from "@/lib/data/dairy-records";
import { getHealthRecords } from "@/lib/data/health";
import { getActiveQuarantine } from "@/lib/quarantine";
import { canManageCattle } from "@/lib/authz";
import { getSessionUserName } from "@/lib/session";

export default async function DairyCattlePage() {
  const [cattle, lactationCycles, healthRecords, role, activeUserName] = await Promise.all([
    getCattleList(),
    getLactationCycles(),
    getHealthRecords(),
    getCurrentUserRole(),
    getSessionUserName(),
  ]);

  const lactationByCattleId = Object.fromEntries(lactationCycles.map((l) => [l.cattleId, l]));
  const quarantinedCattleIds = new Set(
    cattle.filter((c) => getActiveQuarantine(healthRecords, c.id)).map((c) => c.id)
  );

  return (
    <>
      <Topbar activeUserName={activeUserName} />
      <main className="flex-1 px-6 md:px-10 py-8">
        <div className="flex items-start justify-between mb-4">
          <DairyTabs />
          {canManageCattle(role) && (
            <LinkButton href="/dairy/new" variant="primary" size="sm">
              + Add cattle
            </LinkButton>
          )}
        </div>
        <CattleTable cattle={cattle} lactationByCattleId={lactationByCattleId} quarantinedCattleIds={quarantinedCattleIds} />
      </main>
    </>
  );
}
