/// <reference path="../pb_data/types.d.ts" />

// Run with: pocketbase migrate up
// Mirrors FinancialTransaction/Task in types/farm.ts. Both restricted
// per MODULE_ROLE_REQUIREMENTS in lib/authz.ts — financials to
// owner/farm_manager/accountant, tasks more broadly since workers and
// vet_agronomist need to update status on tasks assigned to them.
//
// `category` is a single `select` enumerating the full combined
// ExpenseCategory | IncomeCategory union rather than freeform text —
// validated against the same values TypeScript already restricts it to,
// rather than trusting the client to send a valid string.
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");

    const financialTransactions = new Collection({
      type: "base",
      name: "financial_transactions",
      fields: [
        { name: "type", type: "select", required: true, maxSelect: 1, values: ["income", "expense"] },
        {
          name: "enterprise",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["dairy", "sheep", "poultry", "crops"],
        },
        {
          name: "category",
          type: "select",
          required: true,
          maxSelect: 1,
          values: [
            "feed",
            "medicine_vet",
            "seeds_planting_material",
            "fertilizer_chemicals",
            "labor_wages",
            "equipment_maintenance",
            "utilities",
            "transport",
            "other",
            "milk_sale",
            "livestock_sale",
            "egg_sale",
            "wool_sale",
            "crop_sale",
          ],
        },
        { name: "amount", type: "json", required: true },
        { name: "date", type: "date", required: true },
        { name: "description", type: "text", required: true },
        { name: "relatedRecordId", type: "text", required: false },
        { name: "attachments", type: "json", required: false },
        { name: "recordedBy", type: "relation", required: true, collectionId: users.id, maxSelect: 1 },
      ],
      listRule:
        "@request.auth.id != '' && (@request.auth.role = 'owner' || @request.auth.role = 'farm_manager' || @request.auth.role = 'accountant')",
      viewRule:
        "@request.auth.id != '' && (@request.auth.role = 'owner' || @request.auth.role = 'farm_manager' || @request.auth.role = 'accountant')",
      createRule:
        "@request.auth.id != '' && (@request.auth.role = 'owner' || @request.auth.role = 'farm_manager' || @request.auth.role = 'accountant')",
      updateRule:
        "@request.auth.id != '' && (@request.auth.role = 'owner' || @request.auth.role = 'farm_manager' || @request.auth.role = 'accountant')",
      deleteRule: "@request.auth.role = 'owner'",
    });
    app.save(financialTransactions);

    const tasks = new Collection({
      type: "base",
      name: "tasks",
      fields: [
        { name: "title", type: "text", required: true },
        { name: "description", type: "text", required: false },
        {
          name: "enterprise",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["dairy", "sheep", "poultry", "crops"],
        },
        { name: "relatedEntityId", type: "text", required: false },
        { name: "assignedTo", type: "relation", required: false, collectionId: users.id, maxSelect: 1 },
        { name: "dueDate", type: "date", required: true },
        {
          name: "status",
          type: "select",
          required: true,
          maxSelect: 1,
          values: ["pending", "in_progress", "completed", "overdue", "cancelled"],
        },
        { name: "priority", type: "select", required: true, maxSelect: 1, values: ["low", "medium", "high", "urgent"] },
        {
          name: "recurrence",
          type: "select",
          required: false,
          maxSelect: 1,
          values: ["none", "daily", "weekly", "monthly"],
        },
        { name: "completedAt", type: "date", required: false },
      ],
      listRule:
        "@request.auth.id != '' && (@request.auth.role = 'owner' || @request.auth.role = 'farm_manager' || @request.auth.role = 'enterprise_lead' || @request.auth.role = 'worker' || @request.auth.role = 'vet_agronomist')",
      viewRule:
        "@request.auth.id != '' && (@request.auth.role = 'owner' || @request.auth.role = 'farm_manager' || @request.auth.role = 'enterprise_lead' || @request.auth.role = 'worker' || @request.auth.role = 'vet_agronomist')",
      createRule:
        "@request.auth.id != '' && (@request.auth.role = 'owner' || @request.auth.role = 'farm_manager' || @request.auth.role = 'enterprise_lead')",
      // Broader than create — workers/vet_agronomist need to update status
      // on tasks assigned to them, not just the roles that can create new ones.
      updateRule:
        "@request.auth.id != '' && (@request.auth.role = 'owner' || @request.auth.role = 'farm_manager' || @request.auth.role = 'enterprise_lead' || @request.auth.role = 'worker' || @request.auth.role = 'vet_agronomist')",
      deleteRule: "@request.auth.role = 'owner' || @request.auth.role = 'farm_manager'",
    });
    return app.save(tasks);
  },
  (app) => {
    app.delete(app.findCollectionByNameOrId("tasks"));
    app.delete(app.findCollectionByNameOrId("financial_transactions"));
  }
);
