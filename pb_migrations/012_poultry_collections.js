/// <reference path="../pb_data/types.d.ts" />

// Run with: pocketbase migrate up
// Mirrors PoultryFlock/EggCollectionLog/PoultryMortalityLog in
// types/farm.ts, including the full 4-value PoultryType (the uploaded
// draft only had layer/broiler — types/farm.ts also has kienyeji and
// breeders, which matter since the real poultry UI already renders all
// four). "poultry" is guest-readable per lib/authz.ts.
migrate(
  (app) => {
    const WRITE_ROLES =
      "@request.auth.id != '' && (@request.auth.role = 'owner' || @request.auth.role = 'farm_manager' || @request.auth.role = 'enterprise_lead' || @request.auth.role = 'worker')";
    const DELETE_ROLE = "@request.auth.role = 'owner'";
    const users = app.findCollectionByNameOrId("users");

    const poultryFlocks = new Collection({
      type: "base",
      name: "poultry_flocks",
      fields: [
        { name: "flockName", type: "text", required: true },
        {
          name: "type",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["layers", "broilers", "kienyeji", "breeders"],
        },
        { name: "breed", type: "text", required: true },
        { name: "housingLocation", type: "text", required: true },
        { name: "currentBirdCount", type: "number", required: true },
        { name: "dateAcquired", type: "date", required: true },
        {
          name: "sourceType",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["hatched_on_farm", "purchased_chicks", "purchased_point_of_lay"],
        },
        { name: "ageWeeksAtAcquisition", type: "number", required: false },
        { name: "status", type: "select", required: true, maxSelect: 1, values: ["active", "retired", "sold_out"] },
      ],
      listRule: "",
      viewRule: "",
      createRule: WRITE_ROLES,
      updateRule: WRITE_ROLES,
      deleteRule: DELETE_ROLE,
    });
    app.save(poultryFlocks);
    const poultryFlocksId = app.findCollectionByNameOrId("poultry_flocks").id;

    const eggCollectionLogs = new Collection({
      type: "base",
      name: "egg_collection_logs",
      fields: [
        { name: "flockId", type: "relation", required: true, collectionId: poultryFlocksId, maxSelect: 1 },
        { name: "date", type: "date", required: true },
        { name: "eggsCollected", type: "number", required: true },
        { name: "eggsBroken", type: "number", required: true },
        { name: "eggsGraded", type: "json", required: false },
        { name: "recordedBy", type: "relation", required: true, collectionId: users.id, maxSelect: 1 },
      ],
      listRule: "",
      viewRule: "",
      createRule: WRITE_ROLES,
      updateRule: WRITE_ROLES,
      deleteRule: DELETE_ROLE,
    });
    app.save(eggCollectionLogs);

    const poultryMortalityLogs = new Collection({
      type: "base",
      name: "poultry_mortality_logs",
      fields: [
        { name: "flockId", type: "relation", required: true, collectionId: poultryFlocksId, maxSelect: 1 },
        { name: "date", type: "date", required: true },
        { name: "birdsLost", type: "number", required: true },
        { name: "suspectedCause", type: "text", required: false },
        { name: "notes", type: "text", required: false },
      ],
      listRule: "",
      viewRule: "",
      createRule: WRITE_ROLES,
      updateRule: WRITE_ROLES,
      deleteRule: DELETE_ROLE,
    });
    return app.save(poultryMortalityLogs);
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId("poultry_mortality_logs"));
    app.delete(app.findCollectionByNameOrId("egg_collection_logs"));
    app.delete(app.findCollectionByNameOrId("poultry_flocks"));
  }
);
