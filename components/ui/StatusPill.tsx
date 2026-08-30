const TONE: Record<string, string> = {
  active: "text-forest-700 border-forest-700/30 bg-forest-700/5",
  dry: "text-clay-600 border-clay-600/30 bg-clay-600/5",
  sold: "text-ink-500 border-ink-300/40 bg-ink-300/5",
  sold_out: "text-ink-500 border-ink-300/40 bg-ink-300/5",
  retired: "text-ink-500 border-ink-300/40 bg-ink-300/5",
  deceased: "text-danger border-danger/30 bg-danger/5",
  culled: "text-danger border-danger/30 bg-danger/5",
  confirmed_pregnant: "text-forest-700 border-forest-700/30 bg-forest-700/5",
  served: "text-gold-600 border-gold-500/40 bg-gold-500/10",
  open: "text-ink-500 border-ink-300/40 bg-ink-300/5",
  dry_off: "text-clay-600 border-clay-600/30 bg-clay-600/5",
  not_applicable: "text-ink-300 border-ink-300/30 bg-transparent",
  positive: "text-forest-700 border-forest-700/30 bg-forest-700/5",
  negative: "text-danger border-danger/30 bg-danger/5",
  pending: "text-gold-600 border-gold-500/40 bg-gold-500/10",
  planned: "text-ink-500 border-ink-300/40 bg-ink-300/5",
  land_prep: "text-clay-600 border-clay-600/30 bg-clay-600/5",
  planted: "text-gold-600 border-gold-500/40 bg-gold-500/10",
  growing: "text-forest-700 border-forest-700/30 bg-forest-700/5",
  flowering_fruiting: "text-gold-600 border-gold-500/40 bg-gold-500/10",
  harvesting: "text-clay-600 border-clay-600/30 bg-clay-600/5",
  completed: "text-ink-500 border-ink-300/40 bg-ink-300/5",
  failed: "text-danger border-danger/30 bg-danger/5",
  seasonal: "text-clay-600 border-clay-600/30 bg-clay-600/5",
  perennial: "text-forest-700 border-forest-700/30 bg-forest-700/5",
};

function labelFor(value: string) {
  return value.replace(/_/g, " ");
}

export function StatusPill({ value }: { value: string }) {
  const tone = TONE[value] ?? "text-ink-500 border-ink-300/40 bg-ink-300/5";
  return (
    <span
      className={`inline-block text-[11px] capitalize px-2 py-0.5 rounded-full border font-mono-data ${tone}`}
    >
      {labelFor(value)}
    </span>
  );
}
