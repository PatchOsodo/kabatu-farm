import { Topbar } from "@/components/layout/Topbar";
import { InventoryTabs } from "@/components/inventory/InventoryTabs";
import { InventoryTable } from "@/components/inventory/InventoryTable";
import { getExpirationBatches, getInventoryItems, getCurrentUserRole } from "@/lib/data/inventory";
import { canManageInventory } from "@/lib/authz";
import { getSessionUserName } from "@/lib/session";

export default async function InventoryPage() {
  const [items, batches, role, activeUserName] = await Promise.all([
    getInventoryItems(),
    getExpirationBatches(),
    getCurrentUserRole(),
    getSessionUserName(),
  ]);

  return (
    <>
      <Topbar activeUserName={activeUserName} />
      <main className="flex-1 px-6 md:px-10 py-8">
        <InventoryTabs />
        <InventoryTable items={items} batches={batches} canEdit={canManageInventory(role)} />
      </main>
    </>
  );
}
