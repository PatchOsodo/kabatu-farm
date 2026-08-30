/// <reference path="../pb_data/types.d.ts" />

// Run with: pocketbase migrate up
// Mirrors MilkLog/BreedingRecord/CalvingRecord/LactationCycle in
// types/farm.ts. "dairy" is guest-readable — same public listRule/viewRule
// as cattle (004_cattle_public_read.js), for consistency at the module
// level even though the UI doesn't surface all of this to guests yet.
//
// Write-role split is deliberate, not copy-pasted: milk_logs gets
// `worker` on create/update, since day-to-day milking entries are exactly
// the task the milk-log UI (components/dairy/MilkLogView.tsx) was built
// for. breeding_records/calving_records get `vet_agronomist` instead,
// since that's clinical data, plus enterprise_lead/farm_manager/owner.
migrate(
  (app) => {
    const cattle = app.findCollectionByNameOrId("cattle");
    const users = app.findCollectionByNameOrId("users");
    const DELETE_ROLE = "@request.auth.role = 'owner'";

    const milkLogs = new Collection({
      type: "base",
      name: "milk_logs",
      fields: [
        { name: "cattleId", type: "relation", required: true, collectionId: cattle.id, maxSelect: 1 },
        { name: "date", type: "date", required: true },
        { name: "session", type: "select", required: true, maxSelect: 1, values: ["morning", "midday", "evening"] },
        { name: "liters", type: "number", required: true },
        { name: "recordedBy", type: "relation", required: true, collectionId: users.id, maxSelect: 1 },
      ],
      listRule: "",
      viewRule: "",
      createRule:
        "@request.auth.id != '' && (@request.auth.role = 'owner' || @request.auth.role = 'farm_manager' || @request.auth.role = 'enterprise_lead' || @request.auth.role = 'worker')",
      updateRule:
        "@request.auth.id != '' && (@request.auth.role = 'owner' || @request.auth.role = 'farm_manager' || @request.auth.role = 'enterprise_lead' || @request.auth.role = 'worker')",
      deleteRule: DELETE_ROLE,
    });
    app.save(milkLogs);

    const CLINICAL_WRITE_ROLES =
      "@request.auth.id != '' && (@request.auth.role = 'owner' || @request.auth.role = 'farm_manager' || @request.auth.role = 'enterprise_lead' || @request.auth.role = 'vet_agronomist')";

    const breedingRecords = new Collection({
      type: "base",
      name: "breeding_records",
      fields: [
        { name: "cattleId", type: "relation", required: true, collectionId: cattle.id, maxSelect: 1 },
        {
          name: "eventType",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["heat_detected", "served", "pregnancy_check", "dried_off", "calved"],
        },
        { name: "eventDate", type: "date", required: true },
        { name: "sireInfo", type: "text", required: false },
        { name: "technician", type: "text", required: false },
        { name: "outcome", type: "select", required: false, maxSelect: 1, values: ["positive", "negative", "pending"] },
        { name: "expectedCalvingDate", type: "date", required: false },
        { name: "notes", type: "text", required: false },
      ],
      listRule: "",
      viewRule: "",
      createRule: CLINICAL_WRITE_ROLES,
      updateRule: CLINICAL_WRITE_ROLES,
      deleteRule: DELETE_ROLE,
    });
    app.save(breedingRecords);

    const calvingRecords = new Collection({
      type: "base",
      name: "calving_records",
      fields: [
        { name: "motherId", type: "relation", required: true, collectionId: cattle.id, maxSelect: 1 },
        { name: "calvingDate", type: "date", required: true },
        { name: "calfId", type: "relation", required: false, collectionId: cattle.id, maxSelect: 1 },
        { name: "calfSex", type: "select", required: false, maxSelect: 1, values: ["female", "male"] },
        {
          name: "outcome",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["live_birth", "stillbirth", "aborted"],
        },
        { name: "complications", type: "text", required: false },
        { name: "assistedBy", type: "relation", required: false, collectionId: users.id, maxSelect: 1 },
      ],
      listRule: "",
      viewRule: "",
      createRule: CLINICAL_WRITE_ROLES,
      updateRule: CLINICAL_WRITE_ROLES,
      deleteRule: DELETE_ROLE,
    });
    app.save(calvingRecords);
    const calvingRecordsId = app.findCollectionByNameOrId("calving_records").id;

    const lactationCycles = new Collection({
      type: "base",
      name: "lactation_cycles",
      fields: [
        { name: "cattleId", type: "relation", required: true, collectionId: cattle.id, maxSelect: 1 },
        { name: "calvingRecordId", type: "relation", required: false, collectionId: calvingRecordsId, maxSelect: 1 },
        { name: "startDate", type: "date", required: true },
        { name: "expectedDryOffDate", type: "date", required: false },
        { name: "endDate", type: "date", required: false },
        { name: "stage", type: "select", required: true, maxSelect: 1, values: ["early", "mid", "late", "dry"] },
        { name: "peakYieldLiters", type: "number", required: false },
        { name: "totalYieldLitersToDate", type: "number", required: true },
        { name: "lactationNumber", type: "number", required: true },
      ],
      listRule: "",
      viewRule: "",
      createRule: CLINICAL_WRITE_ROLES,
      updateRule: CLINICAL_WRITE_ROLES,
      deleteRule: DELETE_ROLE,
    });
    return app.save(lactationCycles);
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId("lactation_cycles"));
    app.delete(app.findCollectionByNameOrId("calving_records"));
    app.delete(app.findCollectionByNameOrId("breeding_records"));
    app.delete(app.findCollectionByNameOrId("milk_logs"));
  }
);
