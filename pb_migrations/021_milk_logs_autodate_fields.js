/// <reference path="../pb_data/types.d.ts" />

// IMPORTANT FINDING, 2026-08-09: PocketBase v0.23+ made `created`/
// `updated` OPTIONAL "autodate" fields that must be explicitly declared
// per collection — they stopped being automatic. Confirmed via
// PocketBase's own v0.23 upgrade docs, and confirmed empirically: a real
// milk_logs record's create/update/getOne/getFirstListItem responses all
// come back with NO `created`/`updated` keys at all.
//
// None of migrations 001-020 ever added AutodateField to ANY collection.
// This means EVERY `createdAt: record.created, updatedAt: record.updated`
// mapping across the entire lib/data/*.ts layer has been silently
// returning `undefined` this whole time, on every collection, not just
// milk_logs.
//
// SCOPE OF THIS MIGRATION: only milk_logs, because that's what the
// offline milk-entry conflict-detection logic (lib/offline/sync.ts)
// actually needs to function — it compares a record's `updated`
// timestamp to detect whether someone else changed it while a device
// was offline. Deliberately NOT touching the other ~20 collections here;
// that's the same gap, but retrofitting all of them is a much bigger,
// separate decision the person should make explicitly, not something to
// bundle silently into an offline-entry feature migration.
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("milk_logs");
    collection.fields.add(new AutodateField({ name: "created", onCreate: true }));
    collection.fields.add(new AutodateField({ name: "updated", onCreate: true, onUpdate: true }));
    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("milk_logs");
    collection.fields.removeByName("created");
    collection.fields.removeByName("updated");
    return app.save(collection);
  }
);
