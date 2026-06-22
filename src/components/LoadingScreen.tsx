import { Trophy } from "lucide-react";

export function LoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-background p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-secondary text-primary">
          <Trophy className="h-7 w-7" />
        </div>
        <p className="text-sm font-extrabold text-muted-foreground">Cargando la polla...</p>
      </div>
    </main>
  );
}
