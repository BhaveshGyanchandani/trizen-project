// A row of headline numbers for a dashboard home — bigger and more prominent
// than SummaryStrip (which is used inline within an event's detail page).
// Same contact-sheet frame-count visual language, sized for a page header.
export default function KpiRow({ stats }) {
  const visible = stats.filter((s) => s.value !== undefined && s.value !== null);
  if (visible.length === 0) return null;

  return (
    <div
      className="mb-7 grid gap-px overflow-hidden rounded-[var(--radius-proof)] border border-line bg-line"
      style={{ gridTemplateColumns: `repeat(${visible.length}, minmax(0, 1fr))` }}
    >
      {visible.map((stat, i) => (
        <div key={i} className="bg-ink px-[18px] py-4">
          <p
            className="font-display text-[30px] leading-none"
            style={stat.tone ? { color: `var(--color-${stat.tone})` } : undefined}
          >
            {stat.value}
          </p>
          <p className="mt-2 font-mono text-[10.5px] tracking-wide text-ash">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
