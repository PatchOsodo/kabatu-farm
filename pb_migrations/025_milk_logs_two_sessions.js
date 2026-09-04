/// <reference path="../pb_data/types.d.ts" />

// Removes "midday" as a valid milk_logs session value — farm now milks
// twice a day (morning/evening) instead of three times, per request
// (2026-09-04).
//
// IMPORTANT — data implication, flagged rather than silently handled:
// this only changes the SELECT FIELD'S allowed values going forward.
// It does NOT touch existing milk_logs rows that already have
// session = "midday" — PocketBase doesn't revalidate or rewrite
// existing data when a select field's `values` list changes, and
// there's no safe automatic way to decide whether a specific past
// midday reading should become "morning" or "evening" — that's a
// judgment call about what actually happened, not something to guess
// here. Any existing midday rows will keep their stored value and
// still display correctly wherever raw data is read, but the app's
// own MilkLog["session"] type no longer includes "midday" after this
// change, and the UI can no longer create new midday entries. If
// existing midday rows should be reassigned to morning/evening, that
// needs a manual decision per record via the PocketBase admin UI (or
// a one-off script written once you know how many exist) — not
// automated here.
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("milk_logs");
    const field = collection.fields.find((f) => f.name === "session");
    if (field) field.values = ["morning", "evening"];
    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("milk_logs");
    const field = collection.fields.find((f) => f.name === "session");
    if (field) field.values = ["morning", "midday", "evening"];
    return app.save(collection);
  }
);
