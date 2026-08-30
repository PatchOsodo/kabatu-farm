/// <reference path="../pb_data/types.d.ts" />

// Run with: pocketbase migrate up
// Mirrors CropCycle/InputApplication/HarvestRecord in types/farm.ts.
// "crops" is guest-readable (GUEST_READABLE_MODULES in lib/authz.ts) —
// listRule/viewRule = "" (public), same pattern as
// 004_cattle_public_read.js. Writes stay restricted to the manager tier;
// enterprise_lead included since that role covers crop supervision.
//
// No self-relations here, and every relation target either already
// exists (land_parcels, inventory_items, users) or was just saved earlier
// in this same migration function — so everything is a single-pass
// inline relation field, verified working against a real v0.23.4
// instance before writing this.
migrate(
  (app) => {
    const WRITE_ROLES =
      "@request.auth.id != '' && (@request.auth.role = 'owner' || @request.auth.role = 'farm_manager' || @request.auth.role = 'enterprise_lead')";
    const DELETE_ROLE = "@request.auth.role = 'owner'";

    const landParcels = app.findCollectionByNameOrId("land_parcels");
    const inventoryItems = app.findCollectionByNameOrId("inventory_items");
    const users = app.findCollectionByNameOrId("users");

    const cropCycles = new Collection({
      type: "base",
      name: "crop_cycles",
      fields: [
        { name: "plotId", type: "relation", required: true, collectionId: landParcels.id, maxSelect: 1 },
        { name: "cropName", type: "text", required: true },
        { name: "variety", type: "text", required: false },
        { name: "lifeCycle", type: "select", required: true, maxSelect: 1, values: ["seasonal", "perennial"] },
        {
          name: "status",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["planned", "land_prep", "planted", "growing", "flowering_fruiting", "harvesting", "completed", "failed"],
        },
        { name: "seasonLabel", type: "text", required: false },
        { name: "plantingDate", type: "date", required: false },
        { name: "expectedHarvestDate", type: "date", required: false },
        { name: "areaPlantedAcres", type: "number", required: true },
        { name: "seedSourceItemId", type: "relation", required: false, collectionId: inventoryItems.id, maxSelect: 1 },
        { name: "seedQuantityUsed", type: "number", required: false },
        { name: "forecastYieldKg", type: "number", required: false },
        { name: "actualYieldToDateKg", type: "number", required: true },
        { name: "notes", type: "text", required: false },
      ],
      listRule: "",
      viewRule: "",
      createRule: WRITE_ROLES,
      updateRule: WRITE_ROLES,
      deleteRule: DELETE_ROLE,
    });
    app.save(cropCycles);
    const cropCyclesId = app.findCollectionByNameOrId("crop_cycles").id;

    const inputApplications = new Collection({
      type: "base",
      name: "input_applications",
      fields: [
        { name: "cropCycleId", type: "relation", required: true, collectionId: cropCyclesId, maxSelect: 1 },
        {
          name: "type",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["fertilizer", "pesticide", "herbicide", "fungicide", "manure", "irrigation"],
        },
        { name: "inventoryItemId", type: "relation", required: false, collectionId: inventoryItems.id, maxSelect: 1 },
        { name: "productName", type: "text", required: true },
        { name: "quantityUsed", type: "number", required: true },
        { name: "unit", type: "select", required: true, maxSelect: 1, values: ["kg", "liters", "grams", "ml"] },
        { name: "applicationDate", type: "date", required: true },
        { name: "method", type: "text", required: false },
        { name: "weatherAtApplication", type: "text", required: false },
        { name: "preHarvestIntervalDays", type: "number", required: false },
        { name: "appliedBy", type: "relation", required: false, collectionId: users.id, maxSelect: 1 },
        { name: "cost", type: "json", required: false },
      ],
      listRule: "",
      viewRule: "",
      createRule: WRITE_ROLES,
      updateRule: WRITE_ROLES,
      deleteRule: DELETE_ROLE,
    });
    app.save(inputApplications);

    const harvestRecords = new Collection({
      type: "base",
      name: "harvest_records",
      fields: [
        { name: "cropCycleId", type: "relation", required: true, collectionId: cropCyclesId, maxSelect: 1 },
        { name: "harvestDate", type: "date", required: true },
        { name: "quantityKg", type: "number", required: true },
        { name: "qualityGrade", type: "text", required: false },
        { name: "laborUsed", type: "number", required: false },
        { name: "destinationInventoryItemId", type: "relation", required: false, collectionId: inventoryItems.id, maxSelect: 1 },
      ],
      listRule: "",
      viewRule: "",
      createRule: WRITE_ROLES,
      updateRule: WRITE_ROLES,
      deleteRule: DELETE_ROLE,
    });
    return app.save(harvestRecords);
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId("harvest_records"));
    app.delete(app.findCollectionByNameOrId("input_applications"));
    app.delete(app.findCollectionByNameOrId("crop_cycles"));
  }
);
