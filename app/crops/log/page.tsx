import { Topbar } from "@/components/layout/Topbar";
import { CropsTabs } from "@/components/crops/CropsTabs";
import { CropsLogView } from "@/components/crops/CropsLogView";
import { getSessionUserName } from "@/lib/session";
import { getCropCycles, getHarvestRecords, getInputApplications, getLandParcels, getCurrentUserRole } from "@/lib/data/crops";
import { getInventoryItems } from "@/lib/data/inventory";
import { canManageCrops } from "@/lib/authz";

export default async function CropsLogPage() {
  const [cropCycles, landParcels, inputApplications, harvestRecords, role, activeUserName, inventoryItems] = await Promise.all([
    getCropCycles(),
    getLandParcels(),
    getInputApplications(),
    getHarvestRecords(),
    getCurrentUserRole(),
    getSessionUserName(),
    getInventoryItems(),
  ]);

  const cropInputItems = inventoryItems.filter((i) => i.category === "chemical_agro");

  return (
    <>
      <Topbar activeUserName={activeUserName} />
      <main className="flex-1 px-6 md:px-10 py-8">
        <CropsTabs />
        <CropsLogView
          cropCycles={cropCycles}
          landParcels={landParcels}
          inputApplications={inputApplications}
          harvestRecords={harvestRecords}
          inventoryItems={cropInputItems}
          canEdit={canManageCrops(role)}
        />
      </main>
    </>
  );
}
