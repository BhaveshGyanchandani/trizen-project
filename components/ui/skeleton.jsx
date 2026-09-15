/** Loading-placeholder primitive from shadcn/ui. */
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }) {
  return (
    <div data-slot="skeleton" className={cn("animate-pulse rounded-md bg-accent", className)} {...props} />
  );
}
