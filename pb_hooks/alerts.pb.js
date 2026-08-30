/// <reference path="../pb_data/types.d.ts" />

// Populates the `alerts` collection (see pb_migrations/014_alerts.js).
// Two alert types are live here: low_stock and expiring_stock.
// health_followup_due / milk_withdrawal_active / breeding_check_due /
// harvest_window_open / task_overdue are NOT implemented yet — see the
// TODO stub for quarantine alerts at the bottom of this file.
//
// Design decision (confirmed with the person, 2026-08-06): inventory_items
// with no linkedEnterprise set (e.g. general fencing wire, fuel) are
// SKIPPED for alerting — alerts.enterprise is a required field with only
// dairy/sheep/poultry/crops as values, and there's deliberately no
// "general" bucket, so we don't mislabel or silently guess.
//
// IMPORTANT — verified against a real v0.23.4 server, not just docs:
// PocketBase's JSVM executes every hook/cron handler as its OWN isolated
// program. Top-level functions declared elsewhere in this file are NOT
// visible inside a handler — calling one throws
// "ReferenceError: <fn> is not defined". Confirmed empirically (first
// draft of this file used a shared top-level `evaluateInventoryItem()`
// and every create/update on inventory_items failed with exactly that
// error, even though the record itself was already persisted). Fix:
// every handler below is fully self-contained, with its own local copies
// of the upsert/resolve logic. This means real duplication across the
// two event hooks per collection and the cron sweep — that's intentional,
// not an oversight, given the constraint.
//
// Two mechanisms per collection, same logic duplicated in each:
//  1. Event hooks — fire immediately whenever currentQuantity or a
//     batch's expiration data changes (covers the normal app flow, since
//     createStockMovement() in lib/data/inventory.ts always goes through
//     a real record update).
//  2. A cron sweep every 15 minutes as a backstop, in case records are
//     ever edited by something that bypasses the app.

// ── inventory_items: low_stock ──────────────────────────────────────────

onRecordAfterCreateSuccess((e) => {
  const record = e.record;
  const app = e.app;
  const linkedEnterprise = record.getString("linkedEnterprise");
  if (linkedEnterprise) {
    const currentQuantity = record.getFloat("currentQuantity");
    const reorderThreshold = record.getFloat("reorderThreshold");
    const existing = app.findRecordsByFilter(
      "alerts",
      "type = 'low_stock' && relatedRecordId = {:id} && resolvedAt = ''",
      "", 1, 0, { id: record.id }
    );
    if (currentQuantity <= reorderThreshold) {
      const severity = currentQuantity <= 0 ? "critical" : "warning";
      const message = record.getString("name") + " is low: " + currentQuantity + " " +
        record.getString("unit") + " remaining (reorder at " + reorderThreshold + " " + record.getString("unit") + ")";
      if (existing.length > 0) {
        existing[0].set("severity", severity);
        existing[0].set("message", message);
        app.save(existing[0]);
      } else {
        const alertsCol = app.findCollectionByNameOrId("alerts");
        const alert = new Record(alertsCol);
        alert.set("type", "low_stock");
        alert.set("severity", severity);
        alert.set("message", message);
        alert.set("enterprise", linkedEnterprise);
        alert.set("relatedRecordId", record.id);
        app.save(alert);
      }
    } else if (existing.length > 0) {
      existing[0].set("resolvedAt", new Date().toISOString());
      app.save(existing[0]);
    }
  }
  e.next();
}, "inventory_items");

onRecordAfterUpdateSuccess((e) => {
  const record = e.record;
  const app = e.app;
  const linkedEnterprise = record.getString("linkedEnterprise");
  if (linkedEnterprise) {
    const currentQuantity = record.getFloat("currentQuantity");
    const reorderThreshold = record.getFloat("reorderThreshold");
    const existing = app.findRecordsByFilter(
      "alerts",
      "type = 'low_stock' && relatedRecordId = {:id} && resolvedAt = ''",
      "", 1, 0, { id: record.id }
    );
    if (currentQuantity <= reorderThreshold) {
      const severity = currentQuantity <= 0 ? "critical" : "warning";
      const message = record.getString("name") + " is low: " + currentQuantity + " " +
        record.getString("unit") + " remaining (reorder at " + reorderThreshold + " " + record.getString("unit") + ")";
      if (existing.length > 0) {
        existing[0].set("severity", severity);
        existing[0].set("message", message);
        app.save(existing[0]);
      } else {
        const alertsCol = app.findCollectionByNameOrId("alerts");
        const alert = new Record(alertsCol);
        alert.set("type", "low_stock");
        alert.set("severity", severity);
        alert.set("message", message);
        alert.set("enterprise", linkedEnterprise);
        alert.set("relatedRecordId", record.id);
        app.save(alert);
      }
    } else if (existing.length > 0) {
      existing[0].set("resolvedAt", new Date().toISOString());
      app.save(existing[0]);
    }
  }
  e.next();
}, "inventory_items");

// ── expiration_batches: expiring_stock ──────────────────────────────────

onRecordAfterCreateSuccess((e) => {
  const record = e.record;
  const app = e.app;
  let item;
  try {
    item = app.findRecordById("inventory_items", record.getString("itemId"));
  } catch (err) {
    e.next();
    return;
  }
  const linkedEnterprise = item.getString("linkedEnterprise");
  if (linkedEnterprise) {
    const expirationDate = new Date(record.getString("expirationDate"));
    const daysUntil = Math.floor((expirationDate.getTime() - Date.now()) / 86400000);
    const existing = app.findRecordsByFilter(
      "alerts",
      "type = 'expiring_stock' && relatedRecordId = {:id} && resolvedAt = ''",
      "", 1, 0, { id: record.id }
    );
    if (daysUntil <= 30) {
      const severity = daysUntil <= 0 ? "critical" : daysUntil <= 7 ? "warning" : "info";
      const messageVerb = daysUntil <= 0 ? "expired" : "expires in " + daysUntil + " day(s)";
      const message = item.getString("name") + " batch " + (record.getString("batchNumber") || record.id) + " " + messageVerb;
      if (existing.length > 0) {
        existing[0].set("severity", severity);
        existing[0].set("message", message);
        app.save(existing[0]);
      } else {
        const alertsCol = app.findCollectionByNameOrId("alerts");
        const alert = new Record(alertsCol);
        alert.set("type", "expiring_stock");
        alert.set("severity", severity);
        alert.set("message", message);
        alert.set("enterprise", linkedEnterprise);
        alert.set("relatedRecordId", record.id);
        app.save(alert);
      }
    } else if (existing.length > 0) {
      existing[0].set("resolvedAt", new Date().toISOString());
      app.save(existing[0]);
    }
  }
  e.next();
}, "expiration_batches");

onRecordAfterUpdateSuccess((e) => {
  const record = e.record;
  const app = e.app;
  let item;
  try {
    item = app.findRecordById("inventory_items", record.getString("itemId"));
  } catch (err) {
    e.next();
    return;
  }
  const linkedEnterprise = item.getString("linkedEnterprise");
  if (linkedEnterprise) {
    const expirationDate = new Date(record.getString("expirationDate"));
    const daysUntil = Math.floor((expirationDate.getTime() - Date.now()) / 86400000);
    const existing = app.findRecordsByFilter(
      "alerts",
      "type = 'expiring_stock' && relatedRecordId = {:id} && resolvedAt = ''",
      "", 1, 0, { id: record.id }
    );
    if (daysUntil <= 30) {
      const severity = daysUntil <= 0 ? "critical" : daysUntil <= 7 ? "warning" : "info";
      const messageVerb = daysUntil <= 0 ? "expired" : "expires in " + daysUntil + " day(s)";
      const message = item.getString("name") + " batch " + (record.getString("batchNumber") || record.id) + " " + messageVerb;
      if (existing.length > 0) {
        existing[0].set("severity", severity);
        existing[0].set("message", message);
        app.save(existing[0]);
      } else {
        const alertsCol = app.findCollectionByNameOrId("alerts");
        const alert = new Record(alertsCol);
        alert.set("type", "expiring_stock");
        alert.set("severity", severity);
        alert.set("message", message);
        alert.set("enterprise", linkedEnterprise);
        alert.set("relatedRecordId", record.id);
        app.save(alert);
      }
    } else if (existing.length > 0) {
      existing[0].set("resolvedAt", new Date().toISOString());
      app.save(existing[0]);
    }
  }
  e.next();
}, "expiration_batches");

// ── cron backstop (catches anything that bypassed the event hooks) ─────

cronAdd("alertsSweep", "*/15 * * * *", () => {
  const items = $app.findRecordsByFilter("inventory_items", "linkedEnterprise != ''", "", 0, 0);
  for (let i = 0; i < items.length; i++) {
    const record = items[i];
    const linkedEnterprise = record.getString("linkedEnterprise");
    const currentQuantity = record.getFloat("currentQuantity");
    const reorderThreshold = record.getFloat("reorderThreshold");
    const existing = $app.findRecordsByFilter(
      "alerts",
      "type = 'low_stock' && relatedRecordId = {:id} && resolvedAt = ''",
      "", 1, 0, { id: record.id }
    );
    if (currentQuantity <= reorderThreshold) {
      const severity = currentQuantity <= 0 ? "critical" : "warning";
      const message = record.getString("name") + " is low: " + currentQuantity + " " +
        record.getString("unit") + " remaining (reorder at " + reorderThreshold + " " + record.getString("unit") + ")";
      if (existing.length > 0) {
        existing[0].set("severity", severity);
        existing[0].set("message", message);
        $app.save(existing[0]);
      } else {
        const alertsCol = $app.findCollectionByNameOrId("alerts");
        const alert = new Record(alertsCol);
        alert.set("type", "low_stock");
        alert.set("severity", severity);
        alert.set("message", message);
        alert.set("enterprise", linkedEnterprise);
        alert.set("relatedRecordId", record.id);
        $app.save(alert);
      }
    } else if (existing.length > 0) {
      existing[0].set("resolvedAt", new Date().toISOString());
      $app.save(existing[0]);
    }
  }

  const batches = $app.findRecordsByFilter("expiration_batches", "", "", 0, 0);
  for (let i = 0; i < batches.length; i++) {
    const record = batches[i];
    let item;
    try {
      item = $app.findRecordById("inventory_items", record.getString("itemId"));
    } catch (err) {
      continue;
    }
    const linkedEnterprise = item.getString("linkedEnterprise");
    if (!linkedEnterprise) continue;
    const expirationDate = new Date(record.getString("expirationDate"));
    const daysUntil = Math.floor((expirationDate.getTime() - Date.now()) / 86400000);
    const existing = $app.findRecordsByFilter(
      "alerts",
      "type = 'expiring_stock' && relatedRecordId = {:id} && resolvedAt = ''",
      "", 1, 0, { id: record.id }
    );
    if (daysUntil <= 30) {
      const severity = daysUntil <= 0 ? "critical" : daysUntil <= 7 ? "warning" : "info";
      const messageVerb = daysUntil <= 0 ? "expired" : "expires in " + daysUntil + " day(s)";
      const message = item.getString("name") + " batch " + (record.getString("batchNumber") || record.id) + " " + messageVerb;
      if (existing.length > 0) {
        existing[0].set("severity", severity);
        existing[0].set("message", message);
        $app.save(existing[0]);
      } else {
        const alertsCol = $app.findCollectionByNameOrId("alerts");
        const alert = new Record(alertsCol);
        alert.set("type", "expiring_stock");
        alert.set("severity", severity);
        alert.set("message", message);
        alert.set("enterprise", linkedEnterprise);
        alert.set("relatedRecordId", record.id);
        $app.save(alert);
      }
    } else if (existing.length > 0) {
      existing[0].set("resolvedAt", new Date().toISOString());
      $app.save(existing[0]);
    }
  }
});

// ── TODO (not implemented) ──────────────────────────────────────────────
// Quarantine alerts (milk_withdrawal_active / health_followup_due):
// would scan health_records for quarantineUntilDate > now and/or
// followUpDate <= now, and upsert an alert per animalId/flock. Needs its
// own enterprise-resolution logic (cattle -> dairy, sheep flock -> sheep,
// poultry flock -> poultry) since health_records.animalId is a loose text
// reference, not a typed relation. Deliberately left unbuilt — flagged in
// tracker.md as a real next step, not forgotten.
