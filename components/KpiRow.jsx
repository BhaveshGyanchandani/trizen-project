import { Card, CardContent } from "@/components/ui/card";

// A row of headline numbers for a dashboard home — real shadcn Cards in a
// grid rather than a single bordered strip, so each figure reads as its own
// unit of information.
export default function KpiRow({ stats }) {
  const visible = stats.filter((s) => s.value !== undefined && s.value !== null);
  if (visible.length === 0) return null;

  return (
    <div
      className="mb-7 grid gap-3"
      style={{ gridTemplateColumns: `repeat(${visible.length}, minmax(0, 1fr))` }}
    >
      {visible.map((stat, i) => (
        <Card key={i} className="py-4">
          <CardContent className="px-5">
            <p
              className="text-[28px] font-semibold leading-none tracking-tight"
              style={stat.tone ? { color: `var(--color-${stat.tone})` } : undefined}
            >
              {stat.value}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{stat.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
