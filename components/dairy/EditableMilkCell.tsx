"use client";

import { useEffect, useRef, useState } from "react";

interface EditableMilkCellProps {
  value: number;
  onCommit: (next: number) => void;
}

export function EditableMilkCell({ value, onCommit }: EditableMilkCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [justSaved, setJustSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  function commit() {
    const parsed = parseFloat(draft);
    const next = Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 10) / 10 : value;
    setEditing(false);
    if (next !== value) {
      onCommit(next);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 900);
    }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        step="0.1"
        min="0"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setDraft(String(value));
            setEditing(false);
          }
        }}
        className="w-16 text-center font-mono-data text-sm px-1 py-1 rounded border border-gold-500 bg-white focus:outline-none"
      />
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={[
        "w-16 text-center font-mono-data text-sm px-1 py-1 rounded border transition-colors",
        justSaved
          ? "border-gold-500 bg-gold-500/10 text-ink-900"
          : "border-transparent hover:border-line text-ink-900",
      ].join(" ")}
    >
      {value > 0 ? value.toFixed(1) : "–"}
    </button>
  );
}
