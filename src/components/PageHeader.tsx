import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border bg-white/94 p-4 shadow-soft ring-1 ring-white/70 sm:p-5",
        className,
      )}
    >
      <div className="flag-band absolute inset-x-0 top-0 h-1" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-accent sm:tracking-[0.18em]">Mundial 2026</p>
          <h1 className="mt-1 text-2xl font-black leading-tight text-primary sm:text-3xl">{title}</h1>
          {description ? <p className="mt-2 max-w-3xl text-sm font-bold leading-relaxed text-muted-foreground">{description}</p> : null}
        </div>
        {action ? <div className="w-full shrink-0 sm:w-auto [&>button]:w-full sm:[&>button]:w-auto">{action}</div> : null}
      </div>
    </div>
  );
}
