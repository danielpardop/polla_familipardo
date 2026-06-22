import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6 text-center">
      <div>
        <p className="text-7xl font-black text-primary">404</p>
        <h1 className="mt-3 text-2xl font-black">Pagina no encontrada</h1>
        <Button className="mt-6" asChild>
          <Link to="/predictions">Volver a partidos</Link>
        </Button>
      </div>
    </main>
  );
}
