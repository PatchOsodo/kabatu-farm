import type { HealthRecord } from "@/types/farm";

interface QuarantineBadgeProps {
  activeQuarantine: HealthRecord | undefined;
}

/**
 * Solid fill, not StatusPill's outline pattern — this is a "don't sell
 * this animal's milk/meat" warning, deliberately more visually urgent
 * than a routine status pill.
 */
export function QuarantineBadge({ activeQuarantine }: QuarantineBadgeProps) {
  if (!activeQuarantine) return null;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-danger text-white"
      title={activeQuarantine.diagnosis ? `Reason: ${activeQuarantine.diagnosis}` : undefined}
    >
      Quarantined / Non-Sellable · until {activeQuarantine.quarantineUntilDate}
    </span>
  );
}
