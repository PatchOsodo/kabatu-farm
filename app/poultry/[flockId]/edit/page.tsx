import { notFound, redirect } from "next/navigation";
import { Topbar } from "@/components/layout/Topbar";
import { PoultryFlockForm } from "@/components/livestock/PoultryFlockForm";
import { updatePoultryFlockAction } from "@/lib/actions/poultry";
import { getPoultryFlockById, getCurrentUserRole } from "@/lib/data/poultry";
import { canManagePoultry } from "@/lib/authz";
import { getSessionUserName } from "@/lib/session";

export default async function EditPoultryFlockPage({ params }: { params: Promise<{ flockId: string }> }) {
  const { flockId } = await params;

  const role = await getCurrentUserRole();
  if (!canManagePoultry(role)) redirect(`/poultry/${flockId}`);

  const flock = await getPoultryFlockById(flockId);
  if (!flock) notFound();

  const activeUserName = await getSessionUserName();
  const boundAction = updatePoultryFlockAction.bind(null, flockId);

  return (
    <>
      <Topbar activeUserName={activeUserName} />
      <main className="flex-1 px-6 md:px-10 py-8">
        <h1 className="font-display text-2xl text-ink-900 mb-6">Edit {flock.flockName}</h1>
        <PoultryFlockForm action={boundAction} initial={flock} cancelHref={`/poultry/${flockId}`} />
      </main>
    </>
  );
}
