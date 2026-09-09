export default function EmptyState({ title, description, action, tone = "ink" }) {
  const border = tone === "paper" ? "border-paper-line" : "border-line";
  const desc = tone === "paper" ? "text-clay" : "text-ash";
  return (
    <div className={`rounded-[var(--radius-proof)] border border-dashed ${border} px-6 py-14 text-center`}>
      <p className="font-display text-xl">{title}</p>
      {description && <p className={`mx-auto mt-2 max-w-sm text-sm ${desc}`}>{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
