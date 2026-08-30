/// <reference path="../pb_data/types.d.ts" />

// Run with: pocketbase migrate up
//
// This is Phase 2.1's schema step, per the original Master Handoff's own
// plan (019_quarantine_extension.js in that doc — renumbered to 018 here
// since it's the next real migration in this project's actual sequence).
//
// Both health_records and feed_consumption_logs already exist
// (010_health_feed.js) — this is additive, not a recreation. Adding
// fields to an existing collection follows the same
// find-then-fields.add-then-save pattern as 001_users_role_fields.js.
migrate(
  (app) => {
    const healthRecords = app.findCollectionByNameOrId("health_records");
    healthRecords.fields.add(new NumberField({ name: "withdrawalDaysMilk", required: false }));
    healthRecords.fields.add(new NumberField({ name: "withdrawalDaysMeat", required: false }));
    healthRecords.fields.add(new DateField({ name: "quarantineUntilDate", required: false }));
    app.save(healthRecords);

    // Broaden feed log entry to any authenticated user — day-to-day feed
    // logging needs to be frictionless for field workers, unlike health
    // records (clinical/quarantine data, kept at the manager+vet tier).
    const feedLogs = app.findCollectionByNameOrId("feed_consumption_logs");
    feedLogs.createRule = "@request.auth.id != ''";
    feedLogs.updateRule = "@request.auth.id != ''";
    return app.save(feedLogs);
  },
  (app) => {
    const healthRecords = app.findCollectionByNameOrId("health_records");
    healthRecords.fields.removeByName("withdrawalDaysMilk");
    healthRecords.fields.removeByName("withdrawalDaysMeat");
    healthRecords.fields.removeByName("quarantineUntilDate");
    app.save(healthRecords);

    const feedLogs = app.findCollectionByNameOrId("feed_consumption_logs");
    feedLogs.createRule =
      "@request.auth.id != '' && (@request.auth.role = 'owner' || @request.auth.role = 'farm_manager' || @request.auth.role = 'enterprise_lead' || @request.auth.role = 'vet_agronomist')";
    feedLogs.updateRule = feedLogs.createRule;
    return app.save(feedLogs);
  }
);
