import { Topbar } from "@/components/layout/Topbar";
import { SheepTabs } from "@/components/livestock/SheepTabs";
import { SheepEventsView } from "@/components/livestock/SheepEventsView";
import { getSessionUserName } from "@/lib/session";
import {
  getLambingRecords,
  getMeatOffFlockRecords,
  getSheepFlocks,
  getWoolHarvestRecords,
  getCurrentUserRole,
} from "@/lib/data/sheep";
import { canManageSheep } from "@/lib/authz";

export default async function SheepEventsPage() {
  const [flocks, lambingRecords, woolRecords, meatRecords, role, activeUserName] = await Promise.all([
    getSheepFlocks(),
    getLambingRecords(),
    getWoolHarvestRecords(),
    getMeatOffFlockRecords(),
    getCurrentUserRole(),
    getSessionUserName(),
  ]);

  return (
    <>
      <Topbar activeUserName={activeUserName} />
      <main className="flex-1 px-6 md:px-10 py-8">
        <SheepTabs />
        <SheepEventsView
          flocks={flocks}
          lambingRecords={lambingRecords}
          woolRecords={woolRecords}
          meatRecords={meatRecords}
          canEdit={canManageSheep(role)}
        />
      </main>
    </>
  );
}
