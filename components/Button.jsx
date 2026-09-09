const variants = {
  primary:
    "bg-safelight text-white hover:bg-safelight-dim disabled:bg-safelight/40",
  secondary:
    "bg-transparent text-bone border border-line hover:border-ash disabled:text-ash-dim disabled:border-line-soft",
  "secondary-paper":
    "bg-transparent text-plate border border-paper-line hover:border-clay disabled:text-clay-dim",
  ghost: "bg-transparent text-ash hover:text-bone disabled:text-ash-dim",
  danger:
    "bg-transparent text-safelight border border-safelight/40 hover:bg-safelight-tint/10 disabled:opacity-40",
};

export default function Button({
  variant = "primary",
  className = "",
  as: Comp = "button",
  ...props
}) {
  return (
    <Comp
      className={`inline-flex items-center justify-center gap-2 rounded-[var(--radius-proof)] px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
