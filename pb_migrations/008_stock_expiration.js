/// <reference path="../pb_data/types.d.ts" />

// Run with: pocketbase migrate up
// Mirrors StockMovement/ExpirationBatch in types/farm.ts. Same access
// tier as inventory_items (006) since both are sub-records of the same
// restricted module.
migrate(
  (app) => {
    const READ_ROLES =
      "@request.auth.id != '' && (@request.auth.role = 'owner' || @request.auth.role = 'farm_manager' || @request.auth.role = 'enterprise_lead' || @request.auth.role = 'accountant')";
    const WRITE_ROLES =
      "@request.auth.id != '' && (@request.auth.role = 'owner' || @request.auth.role = 'farm_manager' || @request.auth.role = 'enterprise_lead')";
    const DELETE_ROLE = "@request.auth.role = 'owner'";

    const inventoryItems = app.findCollectionByNameOrId("inventory_items");
    const users = app.findCollectionByNameOrId("users");

    const stockMovements = new Collection({
      type: "base",
      name: "stock_movements",
      fields: [
        { name: "itemId", type: "relation", required: true, collectionId: inventoryItems.id, maxSelect: 1 },
        {
          name: "type",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["purchase_in", "production_in", "consumption_out", "sale_out", "spoilage_loss", "adjustment"],
        },
        { name: "quantity", type: "number", required: true },
        { name: "date", type: "date", required: true },
        // Loosely typed on purpose — can reference a HarvestRecord, MilkLog,
        // InputApplication, etc. across different collections, which
        // PocketBase relations can't polymorphically target.
        { name: "relatedRecordId", type: "text", required: false },
        { name: "performedBy", type: "relation", required: true, collectionId: users.id, maxSelect: 1 },
        { name: "notes", type: "text", required: false },
      ],
      listRule: READ_ROLES,
      viewRule: READ_ROLES,
      createRule: WRITE_ROLES,
      updateRule: WRITE_ROLES,
      deleteRule: DELETE_ROLE,
    });
    app.save(stockMovements);

    const expirationBatches = new Collection({
      type: "base",
      name: "expiration_batches",
      fields: [
        { name: "itemId", type: "relation", required: true, collectionId: inventoryItems.id, maxSelect: 1 },
        { name: "batchNumber", type: "text", required: false },
        { name: "quantity", type: "number", required: true },
        { name: "expirationDate", type: "date", required: true },
        { name: "receivedDate", type: "date", required: true },
      ],
      listRule: READ_ROLES,
      viewRule: READ_ROLES,
      createRule: WRITE_ROLES,
      updateRule: WRITE_ROLES,
      deleteRule: DELETE_ROLE,
    });
    return app.save(expirationBatches);
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId("expiration_batches"));
    app.delete(app.findCollectionByNameOrId("stock_movements"));
  }
);
