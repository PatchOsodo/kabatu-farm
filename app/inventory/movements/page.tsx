import { Topbar } from "@/components/layout/Topbar";
import { InventoryTabs } from "@/components/inventory/InventoryTabs";
import { MovementsView } from "@/components/inventory/MovementsView";
import { getInventoryItems, getStockMovements, getCurrentUserRole } from "@/lib/data/inventory";
import { canManageInventory } from "@/lib/authz";
import { getSessionUserName } from "@/lib/session";

export default async function MovementsPage() {
  const [items, movements, role, activeUserName] = await Promise.all([
    getInventoryItems(),
    getStockMovements(),
    getCurrentUserRole(),
    getSessionUserName(),
  ]);

  return (
    <>
      <Topbar activeUserName={activeUserName} />
      <main className="flex-1 px-6 md:px-10 py-8">
        <InventoryTabs />
        <MovementsView items={items} movements={movements} canEdit={canManageInventory(role)} />
      </main>
    </>
  );
}
