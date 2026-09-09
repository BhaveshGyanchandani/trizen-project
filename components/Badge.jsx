const tones = {
  neutral: "border-line text-ash",
  "neutral-paper": "border-paper-line text-clay",
  published: "border-develop/50 text-develop bg-develop-tint/10",
  draft: "border-warn/50 text-warn bg-warn-tint/10",
  role: "border-safelight/50 text-safelight bg-safelight-tint/10",
};

export default function Badge({ tone = "neutral", children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[var(--radius-proof)] border px-2 py-0.5 font-mono text-[11px] tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
