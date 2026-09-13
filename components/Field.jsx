import { cn } from "@/lib/utils";

export default function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}

// Returns the same classes as the real shadcn Input (components/ui/input.jsx)
// plus an error state. Kept as a function (rather than switching every call
// site to <Input>) because several forms build a custom input element (e.g.
// the numeric PIN entry) that needs these classes merged with extra ones.
// The `tone` param is no longer meaningful — this design uses one register
// throughout — but is kept so existing call sites (`inputClass("ink", ...)`,
// `inputClass("paper", ...)`) don't all need editing at once.
export function inputClass(_tone, hasError = false) {
  return cn(
    "h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow]",
    "placeholder:text-muted-foreground",
    "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
    hasError ? "border-destructive ring-destructive/20" : "border-input"
  );
}
