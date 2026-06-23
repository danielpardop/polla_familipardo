import type { ReactNode } from "react";
import { NavLink as RouterNavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

export function NavLink({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <RouterNavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-md px-2 py-2 text-xs font-extrabold text-muted-foreground transition-colors",
          "hover:bg-muted hover:text-primary",
          isActive && "bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground",
        )
      }
    >
      {icon}
      <span className="truncate">{label}</span>
    </RouterNavLink>
  );
}
