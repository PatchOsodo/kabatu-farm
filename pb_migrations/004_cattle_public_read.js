/// <reference path="../pb_data/types.d.ts" />

// Run with: pocketbase migrate up
//
// Companion to the proxy.ts change making /dairy guest-readable. Without
// this, an unauthenticated visitor to /dairy would still hit PocketBase's
// old auth-required listRule/viewRule and get a rejected request — the
// exact "uncaught Server Components render error" class of bug this app
// already hit once (see lib/pb.ts's server/client URL split). Making a
// route publicly reachable and making its underlying data publicly
// readable are two separate changes; both are required together.
//
// createRule/updateRule/deleteRule are untouched — only who can *read*
// changes here, not who can write.
migrate(
  (app) => {
    const cattle = app.findCollectionByNameOrId("cattle");
    cattle.listRule = "";
    cattle.viewRule = "";
    return app.save(cattle);
  },
  (app) => {
    const cattle = app.findCollectionByNameOrId("cattle");
    cattle.listRule = "@request.auth.id != ''";
    cattle.viewRule = "@request.auth.id != ''";
    return app.save(cattle);
  }
);
