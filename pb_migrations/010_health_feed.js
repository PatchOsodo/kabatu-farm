/// <reference path="../pb_data/types.d.ts" />

// Run with: pocketbase migrate up
// Mirrors HealthRecord/FeedConsumptionLog in types/farm.ts.
//
// NOTE — open design question, flagged in HANDOFF.md, not resolved here:
// neither collection has a corresponding route or ModuleKey yet (no
// /health page, not in GUEST_READABLE_MODULES or MODULE_ROLE_REQUIREMENTS
// in lib/authz.ts). Until that's decided, this uses the same
// "any logged-in user can view, vet_agronomist + manager tier can write"
// baseline cattle used before it became guest-public — safe default,
// not a final answer. Revisit once the health-records UI decision is made.
//
// animalId/flockId are plain text, not typed relations — they need to
// reference records across cattle/sheep_flocks/poultry_flocks depending
// on animalType, which PocketBase relations can't polymorphically target.
migrate(
  (app) => {
    const WRITE_ROLES =
      "@request.auth.id != '' && (@request.auth.role = 'owner' || @request.auth.role = 'farm_manager' || @request.auth.role = 'enterprise_lead' || @request.auth.role = 'vet_agronomist')";
    const DELETE_ROLE = "@request.auth.role = 'owner'";

    const healthRecords = new Collection({
      type: "base",
      name: "health_records",
      fields: [
        { name: "animalId", type: "text", required: true },
        {
          name: "animalType",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["cattle", "sheep", "poultry_flock"],
        },
        {
          name: "eventType",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["vaccination", "treatment", "deworming", "checkup", "injury", "illness"],
        },
        { name: "date", type: "date", required: true },
        { name: "diagnosis", type: "text", required: false },
        { name: "medicineUsed", type: "text", required: false },
        { name: "dosage", type: "text", required: false },
        { name: "administeredBy", type: "text", required: false },
        // Critical field per types/farm.ts's own comment: milk/meat can't
        // be sold until this date. No UI enforces it yet — flagged in
        // HANDOFF.md's Phase 2.1 (quarantine) section, not this batch.
        { name: "withdrawalPeriodEndsOn", type: "date", required: false },
        { name: "cost", type: "json", required: false },
        { name: "followUpDate", type: "date", required: false },
        { name: "notes", type: "text", required: false },
      ],
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: WRITE_ROLES,
      updateRule: WRITE_ROLES,
      deleteRule: DELETE_ROLE,
    });
    app.save(healthRecords);

    const inventoryItems = app.findCollectionByNameOrId("inventory_items");

    const feedConsumptionLogs = new Collection({
      type: "base",
      name: "feed_consumption_logs",
      fields: [
        { name: "flockId", type: "text", required: true },
        {
          name: "animalType",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["poultry_flock", "sheep", "cattle"],
        },
        { name: "date", type: "date", required: true },
        { name: "feedItemId", type: "relation", required: true, collectionId: inventoryItems.id, maxSelect: 1 },
        { name: "quantityKg", type: "number", required: true },
      ],
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: WRITE_ROLES,
      updateRule: WRITE_ROLES,
      deleteRule: DELETE_ROLE,
    });
    return app.save(feedConsumptionLogs);
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId("feed_consumption_logs"));
    app.delete(app.findCollectionByNameOrId("health_records"));
  }
);
