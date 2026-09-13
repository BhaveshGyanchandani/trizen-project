import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Standard shadcn/ui helper: merges conditional class lists (clsx) and then
// resolves conflicting Tailwind utility classes so the last one wins
// (twMerge) — e.g. cn("px-2", condition && "px-4") correctly keeps px-4.
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
