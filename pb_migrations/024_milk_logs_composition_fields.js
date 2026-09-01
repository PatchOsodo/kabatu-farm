/// <reference path="../pb_data/types.d.ts" />

// Adds Kenya QBP (Quality-Based Milk Payment) composition fields to
// milk_logs, per tracker.md's open item: "MilkLog composition fields —
// fat%, protein% fields absent; relevant given Kenya's active QBP
// rollout."
//
// SCOPE NOTE: "safety" was flagged in prior research notes but never
// concretely specified (a lab pass/fail flag? a named test? a numeric
// threshold?). This migration takes the narrowest reasonable
// interpretation — a simple passed/failed status, left blank when
// untested — rather than guessing at a more elaborate schema (e.g.
// antibiotic residue values, somatic cell count) nobody has asked for
// yet. Revisit if the real cooperative form needs more detail.
//
// All three fields are optional (required: false) from the start — most
// milk logs won't have a composition test attached to every single
// entry (this is typically a periodic/per-collection lab result, not
// per-milking), and this codebase has repeatedly hit PocketBase's
// "rejects 0 on required number fields" bug (see 015/017/020/022/023)
// when a numeric field was made required without a real reason to.
// fatPercent/proteinPercent being 0 is also a plausible real lab result
// (spoiled/diluted milk), so being required would risk that exact bug
// again for no benefit.
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("milk_logs");
    collection.fields.add(new NumberField({ name: "fatPercent", required: false, min: 0, max: 100 }));
    collection.fields.add(new NumberField({ name: "proteinPercent", required: false, min: 0, max: 100 }));
    collection.fields.add(
      new SelectField({ name: "safetyStatus", required: false, maxSelect: 1, values: ["passed", "failed"] })
    );
    return app.save(collection);
  },
  (app) => {
    const collection = app.findCollectionByNameOrId("milk_logs");
    collection.fields.removeByName("fatPercent");
    collection.fields.removeByName("proteinPercent");
    collection.fields.removeByName("safetyStatus");
    return app.save(collection);
  }
);
