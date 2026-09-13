// `tone` is no longer meaningful (one register throughout) but kept so
// existing call sites (tone="paper" / tone="ink") don't all need editing.
export default function EmptyState({ title, description, action }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-6 py-14 text-center">
      <p className="text-lg font-semibold">{title}</p>
      {description && (
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
