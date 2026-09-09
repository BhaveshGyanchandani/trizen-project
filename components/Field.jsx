export default function Field({ label, error, tone = "ink", children }) {
  const labelColor = tone === "paper" ? "text-clay" : "text-ash";
  return (
    <label className="block">
      <span className={`mb-1.5 block text-xs font-medium ${labelColor}`}>{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-safelight">{error}</span>}
    </label>
  );
}

const baseInput =
  "w-full rounded-[var(--radius-proof)] px-3 py-2 text-sm outline-none transition-colors";

export function inputClass(tone = "ink", hasError = false) {
  if (tone === "paper") {
    return `${baseInput} bg-paper border ${
      hasError ? "border-safelight" : "border-paper-line"
    } text-plate placeholder:text-clay-dim focus:border-safelight`;
  }
  return `${baseInput} bg-ink-soft border ${
    hasError ? "border-safelight" : "border-line"
  } text-bone placeholder:text-ash-dim focus:border-safelight`;
}
