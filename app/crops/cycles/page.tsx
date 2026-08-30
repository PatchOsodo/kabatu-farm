import { Topbar } from "@/components/layout/Topbar";
import { CropsTabs } from "@/components/crops/CropsTabs";
import { CropCycleTable } from "@/components/crops/CropCycleTable";
import { getCropCycles, getLandParcels, getCurrentUserRole } from "@/lib/data/crops";
import { canManageCrops } from "@/lib/authz";
import { getSessionUserName } from "@/lib/session";

export default async function CropCyclesPage() {
  const [cropCycles, landParcels, role, activeUserName] = await Promise.all([
    getCropCycles(),
    getLandParcels(),
    getCurrentUserRole(),
    getSessionUserName(),
  ]);

  return (
    <>
      <Topbar activeUserName={activeUserName} />
      <main className="flex-1 px-6 md:px-10 py-8">
        <CropsTabs />
        <CropCycleTable cropCycles={cropCycles} landParcels={landParcels} canEdit={canManageCrops(role)} />
      </main>
    </>
  );
}
