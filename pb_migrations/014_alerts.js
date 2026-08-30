/// <reference path="../pb_data/types.d.ts" />

// Run with: pocketbase migrate up
// Mirrors Alert in types/farm.ts. Read access: any logged-in user (not
// guest — operational alerts aren't public). Write access: locked to
// null, meaning only superusers / server-side hooks can create, update,
// or delete alerts — never a regular authenticated user directly. This
// collection is meant to be populated by pb_hooks (per HANDOFF.md, that's
// its own separate, higher-risk step — not built in this migration).
migrate(
  (app) => {
    const collection = new Collection({
      type: "base",
      name: "alerts",
      fields: [
        {
          name: "type",
          type: "select",
          required: true,
          maxSelect: 1,
          values: [
            "low_stock",
            "expiring_stock",
            "health_followup_due",
            "milk_withdrawal_active",
            "breeding_check_due",
            "harvest_window_open",
            "task_overdue",
          ],
        },
        { name: "severity", type: "select", required: true, maxSelect: 1, values: ["info", "warning", "critical"] },
        { name: "message", type: "text", required: true },
        {
          name: "enterprise",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["dairy", "sheep", "poultry", "crops"],
        },
        { name: "relatedRecordId", type: "text", required: false },
        { name: "resolvedAt", type: "date", required: false },
      ],
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: null,
      deleteRule: null,
    });

    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("alerts");
    return app.delete(collection);
  }
);
