import { Home } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <Card className="w-full max-w-md overflow-hidden p-6">
        <div className="flag-band -mx-6 -mt-6 mb-6 h-1.5" />
        <p className="text-7xl font-black text-primary">404</p>
        <h1 className="mt-3 text-2xl font-black">Pagina no encontrada</h1>
        <p className="mx-auto mt-2 max-w-xs text-sm font-bold text-muted-foreground">
          Esta ruta no existe o ya no esta disponible.
        </p>
        <Button className="mt-6" asChild>
          <Link to="/predictions">
            <Home className="h-4 w-4" />
            Volver a partidos
          </Link>
        </Button>
      </Card>
    </main>
  );
}
