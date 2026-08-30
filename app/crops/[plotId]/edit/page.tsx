import { notFound, redirect } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { LandParcelForm } from "@/components/crops/LandParcelForm";
import { updateLandParcelAction } from "@/lib/actions/crops";
import { getLandParcelById, getCurrentUserRole } from "@/lib/data/crops";
import { canManageLandParcels } from "@/lib/authz";
import { getSessionUserName } from "@/lib/session";

export default async function EditLandParcelPage({ params }: { params: Promise<{ plotId: string }> }) {
  const { plotId } = await params;

  const role = await getCurrentUserRole();
  if (!canManageLandParcels(role)) redirect(`/crops/${plotId}`);

  const plot = await getLandParcelById(plotId);
  if (!plot) notFound();

  const activeUserName = await getSessionUserName();
  const boundAction = updateLandParcelAction.bind(null, plotId);

  return (
    <>
      <Topbar activeUserName={activeUserName} />
      <main className="flex-1 px-6 md:px-10 py-8">
        <h1 className="font-display text-2xl text-ink-900 mb-6">Edit {plot.name}</h1>
        <LandParcelForm action={boundAction} initial={plot} cancelHref={`/crops/${plotId}`} />
      </main>
    </>
  );
}
