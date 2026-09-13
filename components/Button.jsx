import { Button as ShadcnButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Thin compatibility layer over the real shadcn Button (components/ui/button.jsx)
// so existing call sites across the app (variant="primary" | "secondary" |
// "secondary-paper" | "ghost" | "danger") don't all need touching at once.
// "secondary" and "secondary-paper" both map to shadcn's "outline" — the old
// design had two visually-distinct neutral buttons for its dark/light
// registers, but this direction uses one neutral surface everywhere.
const variantMap = {
  primary: "default",
  secondary: "outline",
  "secondary-paper": "outline",
  ghost: "ghost",
  danger: "destructive",
};

export default function Button({ variant = "primary", className, as, ...props }) {
  const mapped = variantMap[variant] || "default";
  if (as && as !== "button") {
    // react-router/next Link usage via `as` — render via asChild passthrough
    const Comp = as;
    return (
      <ShadcnButton asChild variant={mapped} className={cn(className)}>
        <Comp {...props} />
      </ShadcnButton>
    );
  }
  return <ShadcnButton variant={mapped} className={cn(className)} {...props} />;
}
