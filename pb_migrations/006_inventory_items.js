/// <reference path="../pb_data/types.d.ts" />

// Run with: pocketbase migrate up
// Mirrors `InventoryItem` in types/farm.ts. NOT guest-readable — matches
// MODULE_ROLE_REQUIREMENTS.inventory in lib/authz.ts (owner, farm_manager,
// enterprise_lead, accountant may view; write access excludes accountant,
// since they oversee cost/valuation, not physical stock movements).
migrate(
  (app) => {
    const READ_ROLES =
      "@request.auth.id != '' && (@request.auth.role = 'owner' || @request.auth.role = 'farm_manager' || @request.auth.role = 'enterprise_lead' || @request.auth.role = 'accountant')";
    const WRITE_ROLES =
      "@request.auth.id != '' && (@request.auth.role = 'owner' || @request.auth.role = 'farm_manager' || @request.auth.role = 'enterprise_lead')";

    const collection = new Collection({
      type: "base",
      name: "inventory_items",
      fields: [
        { name: "name", type: "text", required: true },
        {
          name: "category",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["feed", "seed", "medicine_vet", "chemical_agro", "equipment_consumable", "produce_output"],
        },
        {
          name: "unit",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["kg", "g", "liters", "ml", "bags", "pieces", "doses"],
        },
        { name: "currentQuantity", type: "number", required: true },
        { name: "reorderThreshold", type: "number", required: true },
        // Money shape ({amount, currency}) stored as-is — see HANDOFF.md
        // convention note: JSON fields for Money rather than flattening,
        // so the data layer needs zero mapping logic.
        { name: "unitCost", type: "json", required: false },
        { name: "supplier", type: "text", required: false },
        { name: "storageLocation", type: "text", required: false },
        {
          name: "linkedEnterprise",
          type: "select",
          required: false,
          maxSelect: 1,
          values: ["dairy", "sheep", "poultry", "crops"],
        },
      ],
      listRule: READ_ROLES,
      viewRule: READ_ROLES,
      createRule: WRITE_ROLES,
      updateRule: WRITE_ROLES,
      deleteRule: "@request.auth.role = 'owner'",
    });

    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("inventory_items");
    return app.delete(collection);
  }
);
