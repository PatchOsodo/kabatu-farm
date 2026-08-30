/// <reference path="../pb_data/types.d.ts" />

// Run with: pocketbase migrate up
// Mirrors SheepFlock/LambingRecord/WoolHarvestRecord/MeatOffFlockRecord
// in types/farm.ts — flock-level, NOT individual-animal — matching both
// the type definitions and the existing sheep UI (components/livestock/*)
// exactly. "sheep" is guest-readable per lib/authz.ts.
migrate(
  (app) => {
    const WRITE_ROLES =
      "@request.auth.id != '' && (@request.auth.role = 'owner' || @request.auth.role = 'farm_manager' || @request.auth.role = 'enterprise_lead' || @request.auth.role = 'worker')";
    const DELETE_ROLE = "@request.auth.role = 'owner'";
    const landParcels = app.findCollectionByNameOrId("land_parcels");

    const sheepFlocks = new Collection({
      type: "base",
      name: "sheep_flocks",
      fields: [
        { name: "flockName", type: "text", required: true },
        { name: "breed", type: "text", required: true },
        {
          name: "purpose",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["wool", "meat", "dual_purpose", "breeding_stock"],
        },
        { name: "currentCount", type: "number", required: true },
        { name: "ramCount", type: "number", required: true },
        { name: "eweCount", type: "number", required: true },
        { name: "lambCount", type: "number", required: true },
        { name: "currentPlotId", type: "relation", required: false, collectionId: landParcels.id, maxSelect: 1 },
        { name: "notes", type: "text", required: false },
      ],
      listRule: "",
      viewRule: "",
      createRule: WRITE_ROLES,
      updateRule: WRITE_ROLES,
      deleteRule: DELETE_ROLE,
    });
    app.save(sheepFlocks);
    const sheepFlocksId = app.findCollectionByNameOrId("sheep_flocks").id;

    const lambingRecords = new Collection({
      type: "base",
      name: "lambing_records",
      fields: [
        { name: "flockId", type: "relation", required: true, collectionId: sheepFlocksId, maxSelect: 1 },
        { name: "eweTagId", type: "text", required: false },
        { name: "lambingDate", type: "date", required: true },
        { name: "lambsBornAlive", type: "number", required: true },
        { name: "lambsStillborn", type: "number", required: true },
        { name: "complications", type: "text", required: false },
      ],
      listRule: "",
      viewRule: "",
      createRule: WRITE_ROLES,
      updateRule: WRITE_ROLES,
      deleteRule: DELETE_ROLE,
    });
    app.save(lambingRecords);

    const woolHarvestRecords = new Collection({
      type: "base",
      name: "wool_harvest_records",
      fields: [
        { name: "flockId", type: "relation", required: true, collectionId: sheepFlocksId, maxSelect: 1 },
        { name: "shearingDate", type: "date", required: true },
        { name: "sheepShorn", type: "number", required: true },
        { name: "totalWeightKg", type: "number", required: true },
        { name: "gradeQuality", type: "select", required: false, maxSelect: 1, values: ["fine", "medium", "coarse"] },
        { name: "buyer", type: "text", required: false },
        { name: "saleValue", type: "json", required: false },
      ],
      listRule: "",
      viewRule: "",
      createRule: WRITE_ROLES,
      updateRule: WRITE_ROLES,
      deleteRule: DELETE_ROLE,
    });
    app.save(woolHarvestRecords);

    const meatOffFlockRecords = new Collection({
      type: "base",
      name: "meat_off_flock_records",
      fields: [
        { name: "flockId", type: "relation", required: true, collectionId: sheepFlocksId, maxSelect: 1 },
        { name: "date", type: "date", required: true },
        { name: "animalsSold", type: "number", required: true },
        { name: "totalLiveWeightKg", type: "number", required: false },
        { name: "buyer", type: "text", required: false },
        { name: "saleValue", type: "json", required: false },
      ],
      listRule: "",
      viewRule: "",
      createRule: WRITE_ROLES,
      updateRule: WRITE_ROLES,
      deleteRule: DELETE_ROLE,
    });
    return app.save(meatOffFlockRecords);
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId("meat_off_flock_records"));
    app.delete(app.findCollectionByNameOrId("wool_harvest_records"));
    app.delete(app.findCollectionByNameOrId("lambing_records"));
    app.delete(app.findCollectionByNameOrId("sheep_flocks"));
  }
);
