export default function Topbar({ eyebrow, title, children }) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-ink/90 px-8 py-[18px] backdrop-blur-sm">
      <div>
        {eyebrow && (
          <p className="mb-[3px] font-mono text-[10.5px] tracking-wide text-ash-dim">{eyebrow}</p>
        )}
        <h1 className="font-display text-2xl">{title}</h1>
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}
