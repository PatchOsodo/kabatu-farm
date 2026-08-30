/// <reference path="../pb_data/types.d.ts" />

// Same PocketBase quirk documented in 015/017/020: `0` is rejected on
// `required: true` number fields. This is now the FOURTH time this
// exact issue has been hit in this project — confirmed again live,
// 2026-08-10: creating a brand new sheep_flocks record with lambCount: 0
// (the correct, expected value for a flock that hasn't lambed yet)
// fails with {"code":"validation_required","message":"Cannot be
// blank."}.
//
// Scoped to all four count fields on sheep_flocks — ramCount, eweCount,
// and currentCount are just as capable of legitimately being 0 for some
// flock configurations (e.g. an all-ewe flock has ramCount: 0) as
// lambCount is, so fixing only the one field that happened to trip the
// test would just mean hitting this same bug again next week for a
// different field on the same collection.
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("sheep_flocks");
    for (const name of ["currentCount", "ramCount", "eweCount", "lambCount"]) {
      const field = collection.fields.find((f) => f.name === name);
      if (field) field.required = false;
    }
    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("sheep_flocks");
    for (const name of ["currentCount", "ramCount", "eweCount", "lambCount"]) {
      const field = collection.fields.find((f) => f.name === name);
      if (field) field.required = true;
    }
    return app.save(collection);
  }
);
