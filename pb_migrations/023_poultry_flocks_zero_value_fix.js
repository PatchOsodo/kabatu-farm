/// <reference path="../pb_data/types.d.ts" />

// Same PocketBase quirk as 015/017/020/022. currentBirdCount is less
// likely to legitimately be 0 than sheep_flocks' count fields were (you
// don't usually create a flock with zero birds), but it's not
// impossible — a flock recorded as fully sold-out/died before the
// record gets updated, for instance. Given this exact bug class has now
// hit 4 times, fixing it proactively here rather than waiting to trip
// over a 5th instance.
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("poultry_flocks");
    const field = collection.fields.find((f) => f.name === "currentBirdCount");
    if (field) field.required = false;
    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("poultry_flocks");
    const field = collection.fields.find((f) => f.name === "currentBirdCount");
    if (field) field.required = true;
    return app.save(collection);
  }
);
