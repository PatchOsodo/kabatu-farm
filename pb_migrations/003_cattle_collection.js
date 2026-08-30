/// <reference path="../pb_data/types.d.ts" />

// Run with: pocketbase migrate up
// This mirrors the `Cattle` interface in types/farm.ts field-for-field.
//
// Relation fields (motherId, fatherId, currentPlotId) are added in a
// SECOND save, after the collection already exists. PocketBase's
// `collectionId` on a relation field must be the target collection's real
// internal ID, not its name — and a self-relation (motherId/fatherId
// pointing back at "cattle") can't reference an ID that doesn't exist yet
// during the collection's own creation. So: create the base collection
// first, re-fetch it to get its real ID, then add the relation fields.
migrate(
  (app) => {
    const collection = new Collection({
      type: "base",
      name: "cattle",
      fields: [
        { name: "tagId", type: "text", required: true },
        { name: "name", type: "text" },
        {
          name: "category",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["cow", "heifer", "calf", "bull", "steer"],
        },
        { name: "breed", type: "text", required: true },
        { name: "sex", type: "select", required: true, maxSelect: 1, values: ["female", "male"] },
        { name: "dob", type: "date" },
        {
          name: "status",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["active", "dry", "sold", "deceased", "culled"],
        },
        {
          name: "breedingStatus",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["open", "served", "confirmed_pregnant", "dry_off", "not_applicable"],
        },
        {
          name: "acquisitionType",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["born_on_farm", "purchased"],
        },
        { name: "acquisitionDate", type: "date", required: true },
        { name: "photoUrl", type: "file", maxSelect: 1 },
        { name: "notes", type: "text" },
      ],
      indexes: ["CREATE UNIQUE INDEX idx_cattle_tagId ON cattle (tagId)"],
      // Access matrix applied: everyone logged in can view; owner/manager/
      // enterprise_lead can create or edit; only owner can delete.
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule:
        "@request.auth.id != '' && (@request.auth.role = 'owner' || @request.auth.role = 'farm_manager' || @request.auth.role = 'enterprise_lead')",
      updateRule:
        "@request.auth.id != '' && (@request.auth.role = 'owner' || @request.auth.role = 'farm_manager' || @request.auth.role = 'enterprise_lead')",
      deleteRule: "@request.auth.role = 'owner'",
    });

    app.save(collection);

    // Second pass: now that `cattle` and `land_parcels` both have real IDs,
    // add the relation fields that reference them.
    const cattle = app.findCollectionByNameOrId("cattle");
    const landParcels = app.findCollectionByNameOrId("land_parcels");

    cattle.fields.add(
      new RelationField({ name: "motherId", collectionId: cattle.id, maxSelect: 1 })
    );
    cattle.fields.add(
      new RelationField({ name: "fatherId", collectionId: cattle.id, maxSelect: 1 })
    );
    cattle.fields.add(
      new RelationField({ name: "currentPlotId", collectionId: landParcels.id, maxSelect: 1 })
    );

    return app.save(cattle);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("cattle");
    return app.delete(collection);
  }
);
