/// <reference path="../pb_data/types.d.ts" />

// Same PocketBase quirk documented in 015_inventory_zero_value_fix.js and
// 017_crop_cycles_zero_value_fix.js: `0` is rejected on `required: true`
// number fields. Confirmed again here, live, 2026-08-08: creating a new
// lactation_cycles record with totalYieldLitersToDate: 0 (the correct,
// expected value for a lactation that just started — no milk logged
// against it yet) fails with {"code":"validation_required","message":
// "Cannot be blank."}.
//
// This is the exact situation 015's comment anticipated and deliberately
// deferred: "nothing shipped today creates those from zero yet". Today's
// feature (createCalvingRecord, lib/data/dairy-records.ts) is the first
// thing that does — every calving-triggered lactation cycle starts at
// exactly 0 by definition. Scoped to just this one field, matching the
// narrow-scoping convention of the two prior fixes.
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("lactation_cycles");
    const field = collection.fields.find((f) => f.name === "totalYieldLitersToDate");
    if (field) field.required = false;
    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("lactation_cycles");
    const field = collection.fields.find((f) => f.name === "totalYieldLitersToDate");
    if (field) field.required = true;
    return app.save(collection);
  }
);
