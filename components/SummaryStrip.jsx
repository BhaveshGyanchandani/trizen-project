import { Card, CardContent } from "@/components/ui/card";

// A row of counts inline within an event's detail page — same shadcn Card
// language as KpiRow, sized smaller for a secondary position on the page.
export default function SummaryStrip({ stats }) {
  const visible = stats.filter((s) => s.value !== undefined && s.value !== null);
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {visible.map((stat, i) => (
        <Card key={i} className="min-w-[7.5rem] flex-1 py-3">
          <CardContent className="px-4">
            <p className="text-2xl font-semibold leading-none tracking-tight">{stat.value}</p>
            <p className="mt-1.5 text-[11px] text-muted-foreground">{stat.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
