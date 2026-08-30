/// <reference path="../pb_data/types.d.ts" />

// Same bug as 015_inventory_zero_value_fix.js: PocketBase rejects `0` on
// a `required: true` number field. actualYieldToDateKg starts at 0 for
// every new crop cycle (nothing's been harvested yet) and tracker.md's
// open items confirmed this hits the same validation error. Pre-emptive —
// nothing in the UI creates a crop cycle from scratch yet, so this isn't
// live-breaking today, but it will be the moment that feature exists,
// exactly like inventory's currentQuantity was before 015.
//
// Scoped to just this one field, not a blanket loosening of crop_cycles'
// other required numbers (areaPlantedAcres has no legitimate zero case —
// a crop cycle covering 0 acres isn't a real scenario the way "0 kg
// harvested so far" or "0 units in stock" are).
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("crop_cycles");
    const field = collection.fields.find((f) => f.name === "actualYieldToDateKg");
    if (field) field.required = false;
    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("crop_cycles");
    const field = collection.fields.find((f) => f.name === "actualYieldToDateKg");
    if (field) field.required = true;
    return app.save(collection);
  }
);
