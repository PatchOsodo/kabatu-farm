import { redirect } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { LandParcelForm } from "@/components/crops/LandParcelForm";
import { createLandParcelAction } from "@/lib/actions/crops";
import { getCurrentUserRole } from "@/lib/data/crops";
import { canManageLandParcels } from "@/lib/authz";
import { getSessionUserName } from "@/lib/session";

export default async function NewLandParcelPage() {
  const role = await getCurrentUserRole();
  if (!canManageLandParcels(role)) redirect("/crops");

  const activeUserName = await getSessionUserName();

  return (
    <>
      <Topbar activeUserName={activeUserName} />
      <main className="flex-1 px-6 md:px-10 py-8">
        <h1 className="font-display text-2xl text-ink-900 mb-6">New plot</h1>
        <LandParcelForm action={createLandParcelAction} cancelHref="/crops" />
      </main>
    </>
  );
}
