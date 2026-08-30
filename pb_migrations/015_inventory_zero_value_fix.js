/// <reference path="../pb_data/types.d.ts" />

// PocketBase rejects `0` on `required: true` number fields — confirmed
// against a live instance: updating inventory_items.currentQuantity to 0
// (the ordinary "ran out of stock" event) fails with
// {"code":"validation_required","message":"Cannot be blank."}. This isn't
// a hypothetical edge case; it's the normal end state of consuming the
// last of an item, and it would silently break createStockMovement's
// second write every time it happened (lib/data/inventory.ts) — the
// stock_movements ledger entry succeeds, then the item's quantity update
// throws, leaving the ledger and the item's displayed quantity out of sync.
//
// Scoped narrowly to the two fields on inventory_items where 0 is a
// legitimate, expected value (out of stock; "never alert on this item").
// Not touching other required numeric fields across the schema (e.g.
// crop_cycles.actualYieldToDateKg, also confirmed to hit this) since
// nothing shipped today creates those from zero yet — deferring until
// whatever feature actually needs it, rather than loosening validation
// speculatively across the whole schema.
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("inventory_items");

    const currentQuantity = collection.fields.find((f) => f.name === "currentQuantity");
    if (currentQuantity) currentQuantity.required = false;

    const reorderThreshold = collection.fields.find((f) => f.name === "reorderThreshold");
    if (reorderThreshold) reorderThreshold.required = false;

    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("inventory_items");

    const currentQuantity = collection.fields.find((f) => f.name === "currentQuantity");
    if (currentQuantity) currentQuantity.required = true;

    const reorderThreshold = collection.fields.find((f) => f.name === "reorderThreshold");
    if (reorderThreshold) reorderThreshold.required = true;

    return app.save(collection);
  }
);
