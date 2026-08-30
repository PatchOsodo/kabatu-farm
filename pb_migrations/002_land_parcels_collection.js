/// <reference path="../pb_data/types.d.ts" />

// Run with: pocketbase migrate up
// Mirrors the `LandParcel` interface in types/farm.ts. Created before
// cattle since cattle.currentPlotId relates to this collection.
migrate(
  (app) => {
    const collection = new Collection({
      type: "base",
      name: "land_parcels",
      fields: [
        { name: "name", type: "text", required: true },
        { name: "acreage", type: "number", required: true },
        {
          name: "soilType",
          type: "select",
          maxSelect: 1,
          values: ["loam", "clay", "sandy", "silt", "volcanic", "other"],
        },
        { name: "lastSoilTestDate", type: "date" },
        { name: "soilPH", type: "number" },
        {
          name: "currentUse",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["crop", "grazing", "fallow", "livestock_housing", "infrastructure"],
        },
        { name: "notes", type: "text" },
      ],
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule:
        "@request.auth.id != '' && (@request.auth.role = 'owner' || @request.auth.role = 'farm_manager')",
      updateRule:
        "@request.auth.id != '' && (@request.auth.role = 'owner' || @request.auth.role = 'farm_manager')",
      deleteRule: "@request.auth.role = 'owner'",
    });

    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("land_parcels");
    return app.delete(collection);
  }
);
