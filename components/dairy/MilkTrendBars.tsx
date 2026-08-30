interface DayTotal {
  date: string;
  liters: number;
}

export function MilkTrendBars({ data }: { data: DayTotal[] }) {
  const max = Math.max(...data.map((d) => d.liters), 1);

  return (
    <div className="flex items-end gap-2 h-24">
      {data.map((d) => {
        const heightPct = Math.max(4, (d.liters / max) * 100);
        const weekday = new Date(d.date).toLocaleDateString("en-KE", { weekday: "short" });
        return (
          <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5">
            <span className="text-[10px] font-mono-data text-ink-500">{d.liters}</span>
            <div className="w-full bg-parchment-200 rounded-sm relative h-16 flex items-end">
              <div
                className="w-full bg-gold-500 rounded-sm"
                style={{ height: `${heightPct}%` }}
                aria-hidden
              />
            </div>
            <span className="text-[10px] text-ink-300 uppercase">{weekday}</span>
          </div>
        );
      })}
    </div>
  );
}
