/// <reference path="../pb_data/types.d.ts" />

// Adds a native PocketBase `photo` file field to sheep_flocks and
// poultry_flocks — confirmed scope with the person 2026-08-06 (cattle +
// sheep + poultry).
//
// IMPORTANT correction made while building this: cattle does NOT need a
// new field. `cattle.photoUrl` (003_cattle_collection.js) is ALREADY a
// native PocketBase `file` field, not a plain string — despite
// types/farm.ts typing it as `photoUrl?: string`, which is misleading
// (a file field's JSON value is a filename, not a URL; the actual
// browser-facing URL has to be constructed via PocketBase's file-serving
// convention). types/farm.ts's comment is being corrected in this same
// change to reflect that, without renaming the field or touching data
// (confirmed via grep: `photoUrl` isn't referenced anywhere in lib/,
// components/, or app/ yet, so there's no existing behavior to preserve —
// just a schema field with no UI built on it so far).
//
// Also confirmed: InventoryItem never had a photo field, despite an
// earlier tracker.md claim that it did — not in scope here.
//
// Single image, 5MB cap, common image mime types — same spec as
// cattle.photoUrl, for consistency across all three.

migrate((app) => {
  const photoField = () => new FileField({
    name: "photo",
    maxSelect: 1,
    maxSize: 5242880, // 5MB
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });

  const sheep = app.findCollectionByNameOrId("sheep_flocks");
  sheep.fields.add(photoField());
  app.save(sheep);

  const poultry = app.findCollectionByNameOrId("poultry_flocks");
  poultry.fields.add(photoField());
  app.save(poultry);
}, (app) => {
  const sheep = app.findCollectionByNameOrId("sheep_flocks");
  sheep.fields.removeByName("photo");
  app.save(sheep);

  const poultry = app.findCollectionByNameOrId("poultry_flocks");
  poultry.fields.removeByName("photo");
  app.save(poultry);
});
