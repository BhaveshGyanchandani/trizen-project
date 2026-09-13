import { SidebarTrigger } from "@/components/ui/sidebar";

export default function Topbar({ eyebrow, title, children }) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border bg-background/95 px-5 py-4 backdrop-blur-sm sm:px-8">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <div>
          {eyebrow && <p className="mb-0.5 text-xs font-medium text-muted-foreground">{eyebrow}</p>}
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
        </div>
      </div>
      {children && <div className="flex items-center gap-2.5">{children}</div>}
    </div>
  );
}
