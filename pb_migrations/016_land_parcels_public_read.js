/// <reference path="../pb_data/types.d.ts" />

// Fixes the gap flagged in tracker.md's open items: `land_parcels`
// (002_land_parcels_collection.js) predates the "crops" module's
// guest-readable design and was left requiring auth. crop_cycles
// (007_crop_collections.js) is correctly public. Net effect before this
// fix: an anonymous /crops visitor sees crop-cycle data but an empty
// plot list — inconsistent within the same guest-readable module.
//
// Same pattern as 004_cattle_public_read.js: only listRule/viewRule
// change. Write access (createRule/updateRule/deleteRule) is untouched —
// still owner/farm_manager only, per 002's original design.
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("land_parcels");
    collection.listRule = "";
    collection.viewRule = "";
    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("land_parcels");
    collection.listRule = "@request.auth.id != ''";
    collection.viewRule = "@request.auth.id != ''";
    return app.save(collection);
  }
);
