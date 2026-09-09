"use client";

import { useEffect } from "react";

export default function Modal({ open, onClose, title, children, tone = "ink" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const panelBg = tone === "paper" ? "bg-paper text-plate border-paper-line" : "bg-ink-soft text-bone border-line";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full max-w-md rounded-[var(--radius-proof)] border p-6 shadow-2xl ${panelBg}`}
      >
        {title && <h2 className="font-display text-xl">{title}</h2>}
        <div className={title ? "mt-4" : ""}>{children}</div>
      </div>
    </div>
  );
}
