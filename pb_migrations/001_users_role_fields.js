/// <reference path="../pb_data/types.d.ts" />

// Run with: pocketbase migrate up
//
// Extends PocketBase's default `users` auth collection — no need to build
// a separate auth system, PocketBase already handles password hashing,
// tokens, email verification, etc. We're just adding the two fields that
// let API rules make role-based decisions: `role` and `enterprises`.

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");

    users.fields.add(
      new SelectField({
        name: "role",
        required: true,
        maxSelect: 1,
        values: ["owner", "farm_manager", "enterprise_lead", "worker", "vet_agronomist", "accountant"],
      })
    );

    users.fields.add(
      new SelectField({
        name: "enterprises",
        required: false,
        maxSelect: 4,
        values: ["dairy", "sheep", "poultry", "crops"],
      })
    );

    return app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.fields.removeByName("role");
    users.fields.removeByName("enterprises");
    return app.save(users);
  }
);
