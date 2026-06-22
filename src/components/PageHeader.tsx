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
        "relative overflow-hidden rounded-lg border bg-white p-5 shadow-soft",
        className,
      )}
    >
      <div className="flag-band absolute inset-x-0 top-0 h-1" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-accent">Mundial 2026</p>
          <h1 className="mt-1 text-2xl font-black leading-tight text-primary sm:text-3xl">{title}</h1>
          {description ? <p className="mt-1 text-sm font-bold text-muted-foreground">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
