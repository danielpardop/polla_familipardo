import type { ReactNode } from "react";
import { BarChart3, CalendarCheck, LogOut, ShieldCheck, Trophy } from "lucide-react";
import { NavLink as RouterNavLink, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { NavLink } from "./NavLink";

export function AppLayout() {
  const { profile, isAdmin, signOut } = useAuth();

  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <div className="flag-band h-2 w-full" />
      <header className="sticky top-0 z-30 border-b bg-background/90 shadow-sm backdrop-blur">
        <div className="container flex h-[72px] items-center justify-between gap-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-secondary shadow-sm">
                <Trophy className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-primary">La Gaitana Farms</p>
                <p className="truncate text-xs font-bold text-muted-foreground">{profile?.full_name}</p>
              </div>
            </div>
          </div>
          <nav className="hidden items-center gap-2 md:flex">
            <DesktopLink to="/predictions">Partidos</DesktopLink>
            <DesktopLink to="/leaderboard">Tabla</DesktopLink>
            {isAdmin ? (
              <DesktopLink to="/admin">Admin</DesktopLink>
            ) : null}
          </nav>
          <Button variant="outline" size="icon" onClick={signOut} aria-label="Cerrar sesion" title="Cerrar sesion">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>
      <main className="container py-6">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/96 px-3 py-2 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-md gap-2">
          <NavLink to="/predictions" label="Partidos" icon={<CalendarCheck className="h-5 w-5" />} />
          <NavLink to="/leaderboard" label="Tabla" icon={<BarChart3 className="h-5 w-5" />} />
          {isAdmin ? <NavLink to="/admin" label="Admin" icon={<ShieldCheck className="h-5 w-5" />} /> : null}
        </div>
      </nav>
    </div>
  );
}

function DesktopLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <RouterNavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "rounded-md px-3 py-2 text-sm font-extrabold text-muted-foreground transition-colors hover:bg-muted hover:text-primary",
          isActive && "bg-white text-primary shadow-sm",
        )
      }
    >
      {children}
    </RouterNavLink>
  );
}
