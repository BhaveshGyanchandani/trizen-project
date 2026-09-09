export default function Loader({ label = "Loading", tone = "ink" }) {
  const text = tone === "paper" ? "text-clay" : "text-ash";
  return (
    <div className={`flex items-center gap-3 font-mono text-xs tracking-wide ${text}`}>
      <span className="relative flex h-3 w-3">
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${
            tone === "paper" ? "bg-safelight" : "bg-safelight"
          }`}
        />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-safelight" />
      </span>
      {label}
    </div>
  );
}
