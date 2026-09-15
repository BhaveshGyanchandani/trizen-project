import { Badge as ShadcnBadge } from "@/components/ui/badge";

/**
 * Thin compatibility layer over the real shadcn Badge
 * (components/ui/badge.jsx), mapping this app's semantic tones onto
 * shadcn's variant names.
 */
const toneMap = {
  neutral: "outline",
  published: "success",
  draft: "warning",
  role: "secondary",
};

/** Small status/label pill. `tone` selects a semantic color (see `toneMap`). */
export default function Badge({ tone = "neutral", children, className }) {
  return (
    <ShadcnBadge variant={toneMap[tone] || "outline"} className={className}>
      {children}
    </ShadcnBadge>
  );
}
