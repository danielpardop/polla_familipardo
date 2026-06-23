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
      <header className="sticky top-0 z-30 border-b bg-white/88 shadow-sm backdrop-blur-xl">
        <div className="container flex min-h-[68px] items-center justify-between gap-2 py-2 sm:gap-4 sm:py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary text-secondary shadow-sm ring-1 ring-primary/10">
                <Trophy className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-black leading-tight text-primary">Familia Pardo</p>
                <p className="truncate text-xs font-bold text-muted-foreground">{profile?.full_name}</p>
              </div>
            </div>
          </div>
          <nav className="hidden items-center gap-1 rounded-lg border bg-muted/65 p-1 md:flex">
            <DesktopLink to="/predictions" icon={<CalendarCheck className="h-4 w-4" />}>Partidos</DesktopLink>
            <DesktopLink to="/leaderboard" icon={<BarChart3 className="h-4 w-4" />}>Tabla</DesktopLink>
            {isAdmin ? (
              <DesktopLink to="/admin" icon={<ShieldCheck className="h-4 w-4" />}>Admin</DesktopLink>
            ) : null}
          </nav>
          <Button variant="outline" size="icon" onClick={signOut} aria-label="Cerrar sesion" title="Cerrar sesion">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>
      <main className="container py-4 sm:py-6 lg:py-8">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/94 px-2 py-2 shadow-[0_-12px_30px_hsl(216_72%_22%_/_0.08)] backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-md gap-2">
          <NavLink to="/predictions" label="Partidos" icon={<CalendarCheck className="h-5 w-5" />} />
          <NavLink to="/leaderboard" label="Tabla" icon={<BarChart3 className="h-5 w-5" />} />
          {isAdmin ? <NavLink to="/admin" label="Admin" icon={<ShieldCheck className="h-5 w-5" />} /> : null}
        </div>
      </nav>
    </div>
  );
}

function DesktopLink({ to, icon, children }: { to: string; icon: ReactNode; children: ReactNode }) {
  return (
    <RouterNavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-extrabold text-muted-foreground transition-colors hover:bg-white/75 hover:text-primary",
          isActive && "bg-white text-primary shadow-sm",
        )
      }
    >
      {icon}
      {children}
    </RouterNavLink>
  );
}
