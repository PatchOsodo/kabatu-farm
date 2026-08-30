/// <reference path="../pb_data/types.d.ts" />

// Run with: pocketbase migrate up
//
// Adds `username` as a second login identity alongside email — both work
// after this migration (identityFields: ["email", "username"]), so
// existing accounts that only have an email keep working unchanged.
// `username` stays optional at the field level; PocketBase enforces
// uniqueness only among non-empty values (mirrors the existing email
// index's `WHERE email != ''` pattern), so leaving it blank never
// collides across users.
//
// `email` itself can't be removed — it's a system field on auth
// collections in this PocketBase version — but nothing requires it to be
// the login identity going forward once username is populated.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");

    users.fields.add(
      new TextField({
        name: "username",
        required: false,
        min: 3,
        max: 40,
        pattern: "^[a-zA-Z0-9_.-]+$",
      })
    );

    users.indexes.push(
      "CREATE UNIQUE INDEX idx_users_username ON users (username) WHERE username != ''"
    );

    users.passwordAuth.identityFields = ["email", "username"];

    return app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");

    users.passwordAuth.identityFields = ["email"];
    users.indexes = users.indexes.filter((idx) => !idx.includes("idx_users_username"));
    users.fields.removeByName("username");

    return app.save(users);
  }
);
