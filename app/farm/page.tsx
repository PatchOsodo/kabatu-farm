import Link from "next/link";
import { Topbar } from "@/components/layout/Topbar";
import { getSessionUserName, getSessionRole } from "@/lib/session";
import { canAccessModule, type ModuleKey } from "@/lib/authz";

/**
 * Landing page for the "Farm" bottom-nav destination — a lightweight
 * 4-tile picker rather than defaulting straight into /dairy, so the
 * mobile grouping (Home/Farm/Ops/Money) has a real destination of its
 * own instead of silently guessing which enterprise the person wants.
 * All four are guest-readable today (see GUEST_READABLE_MODULES in
 * lib/authz.ts), but this still runs every tile through
 * canAccessModule() so the picker stays correct if that ever changes.
 */
const FARM_TILES: { key: ModuleKey; label: string; href: string; glyph: string; description: string }[] = [
  { key: "dairy", label: "Dairy Cattle", href: "/dairy", glyph: "🐄", description: "Cattle, milk log, lactation" },
  { key: "sheep", label: "Sheep", href: "/sheep", glyph: "🐑", description: "Flocks, lambing, wool & meat" },
  { key: "poultry", label: "Poultry", href: "/poultry", glyph: "🐔", description: "Flocks, egg log, mortality" },
  { key: "crops", label: "Crops & Fields", href: "/crops", glyph: "🌾", description: "Plots, cycles, inputs & harvests" },
];

export default async function FarmPickerPage() {
  const [activeUserName, role] = await Promise.all([getSessionUserName(), getSessionRole()]);
  const visibleTiles = FARM_TILES.filter((t) => canAccessModule(role, t.key));

  return (
    <>
      <Topbar activeUserName={activeUserName} />
      <main className="flex-1 px-6 md:px-10 py-8">
        <h1 className="font-display text-2xl text-ink-900 mb-6">Farm</h1>
        <div className="grid grid-cols-2 gap-4 max-w-2xl">
          {visibleTiles.map((t) => (
            <Link
              key={t.key}
              href={t.href}
              className="border border-line rounded p-5 bg-parchment-100/40 hover:border-ink-300 transition-colors"
            >
              <span aria-hidden className="text-2xl leading-none">
                {t.glyph}
              </span>
              <p className="font-display text-lg text-ink-900 mt-2">{t.label}</p>
              <p className="text-xs text-ink-500 mt-1">{t.description}</p>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
