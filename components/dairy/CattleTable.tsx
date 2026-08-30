"use client";

import { useMemo, useState } from "react";
import type { Cattle, CattleCategory, LactationCycle } from "@/types/farm";
import { StatusPill } from "./StatusPill";
import { ViewLink } from "@/components/ui/Button";

interface CattleTableProps {
  cattle: Cattle[];
  lactationByCattleId: Record<string, LactationCycle | undefined>;
  quarantinedCattleIds: Set<string>;
}

const CATEGORY_FILTERS: Array<CattleCategory | "all"> = ["all", "cow", "heifer", "calf", "bull", "steer"];

export function CattleTable({ cattle, lactationByCattleId, quarantinedCattleIds }: CattleTableProps) {
  const [category, setCategory] = useState<CattleCategory | "all">("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return cattle.filter((c) => {
      if (category !== "all" && c.category !== category) return false;
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        const haystack = `${c.tagId} ${c.name ?? ""} ${c.breed}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [cattle, category, query]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tag, name, or breed…"
          className="text-sm px-3 py-1.5 rounded border border-line bg-parchment-50 focus:outline-none focus:border-gold-500 w-56"
        />
        <div className="flex gap-1">
          {CATEGORY_FILTERS.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={[
                "text-xs px-2.5 py-1 rounded-full border capitalize transition-colors",
                category === c
                  ? "bg-forest-900 text-parchment-50 border-forest-900"
                  : "border-line text-ink-500 hover:border-ink-300",
              ].join(" ")}
            >
              {c}
            </button>
          ))}
        </div>
        <span className="text-xs text-ink-500 ml-auto font-mono-data">
          {filtered.length} of {cattle.length}
        </span>
      </div>

      <div className="border border-line rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-parchment-100/70 text-left text-ink-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-2.5 font-medium">Tag / Name</th>
              <th className="px-4 py-2.5 font-medium">Category</th>
              <th className="px-4 py-2.5 font-medium">Breed</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Breeding</th>
              <th className="px-4 py-2.5 font-medium text-right">Lactation (L to date)</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const lactation = lactationByCattleId[c.id];
              return (
                <tr key={c.id} className="border-t border-line hover:bg-parchment-100/40">
                  <td className="px-4 py-2.5">
                    <ViewLink href={`/dairy/${c.id}`}>
                      <span className="font-mono-data text-xs text-ink-500 mr-2">{c.tagId}</span>
                      {c.name ?? "—"}
                    </ViewLink>
                    {quarantinedCattleIds.has(c.id) && (
                      <span
                        className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-danger text-white"
                        title="Quarantined — not counted in sellable milk totals"
                      >
                        Quarantined
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 capitalize text-ink-700">{c.category}</td>
                  <td className="px-4 py-2.5 text-ink-700">{c.breed}</td>
                  <td className="px-4 py-2.5">
                    <StatusPill value={c.status} />
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusPill value={c.breedingStatus} />
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono-data text-ink-900">
                    {lactation ? lactation.totalYieldLitersToDate.toLocaleString("en-KE") : "—"}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-500 text-sm">
                  No cattle match this search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
