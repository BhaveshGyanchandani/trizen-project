// A row of counts styled like the frame-count / exposure info printed along
// the edge of a contact sheet or film canister — reinforces the darkroom
// concept instead of adding a generic stat-card grid with shadows.
export default function SummaryStrip({ stats }) {
  const visible = stats.filter((s) => s.value !== undefined && s.value !== null);
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-wrap items-stretch gap-px overflow-hidden rounded-[var(--radius-proof)] border border-line bg-line">
      {visible.map((stat, i) => (
        <div key={i} className="min-w-[7.5rem] flex-1 bg-ink px-4 py-3">
          <p className="font-display text-2xl leading-none">{stat.value}</p>
          <p className="mt-1.5 font-mono text-[11px] tracking-wide text-ash">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
