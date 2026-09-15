"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * Thin compatibility layer over the real shadcn Dialog
 * (components/ui/dialog.jsx) so existing call sites (open/onClose/title
 * props) don't need touching — this now gets real focus-trapping,
 * Escape-to-close, and portal behavior from Radix instead of the
 * previous hand-rolled version.
 */
export default function Modal({ open, onClose, title, children }) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose?.()}>
      <DialogContent className="sm:max-w-md">
        {title && (
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
        )}
        {children}
      </DialogContent>
    </Dialog>
  );
}
