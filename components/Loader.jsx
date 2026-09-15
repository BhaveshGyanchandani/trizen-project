import { Loader2 } from "lucide-react";

/**
 * Small inline loading indicator: a spinning icon plus a label.
 * `tone` is no longer meaningful (one register throughout) but kept so
 * existing call sites (tone="paper" / tone="ink") don't all need editing.
 */
export default function Loader({ label = "Loading" }) {
  return (
    <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin text-primary" />
      {label}
    </div>
  );
}
