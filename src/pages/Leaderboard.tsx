import { useEffect, useState, type ReactNode } from "react";
import { Flag, Medal, Plus, RefreshCw, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api, type LeaderboardRow } from "@/lib/api";

export function Leaderboard() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadLeaderboard() {
    setLoading(true);
    try {
      setRows(await api.getLeaderboard());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No pudimos cargar la tabla.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLeaderboard();
  }, []);

  function showRowDetails(row: LeaderboardRow, index: number) {
    toast.custom(
      (toastId) => (
        <LeaderboardDetailsSnackbar
          row={row}
          position={index + 1}
          onClose={() => toast.dismiss(toastId)}
        />
      ),
      { duration: 7000 },
    );
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Tabla de posiciones"
        description="La carrera amistosa de la Familia Pardo por el marcador perfecto y los goleadores bien elegidos."
        action={
          <Button variant="outline" size="sm" onClick={loadLeaderboard} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
            Recargar
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="flag-band h-1.5" />
        <CardContent className="grid gap-3 p-4 text-sm font-bold leading-relaxed text-muted-foreground sm:grid-cols-[auto_1fr] sm:p-5">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-secondary text-primary shadow-sm">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="font-black text-primary">Hola familia, estas son las reglas para ganar puntos</p>
            <ul className="list-inside list-disc space-y-1">
              <li>Marcador exacto: 6 puntos.</li>
              <li>Ganador y diferencia de goles correcta: 4 puntos.</li>
              <li>Si el partido queda empatado, acertar el empate cuenta como diferencia correcta: 4 puntos.</li>
              <li>Solo ganador, sin marcador exacto ni diferencia correcta: 3 puntos.</li>
              <li>Si no aciertas el resultado: 0 puntos.</li>
              <li>Cada jugador que marques como goleador y si haga gol suma 1 punto extra.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <p className="p-5 text-sm font-bold text-muted-foreground">Cargando tabla...</p>
          ) : rows.length === 0 ? (
            <p className="p-5 text-sm font-bold text-muted-foreground">Aun no hay predicciones puntuadas.</p>
          ) : (
            <>
              <div className="divide-y lg:hidden">
                {rows.map((row, index) => (
                  <div key={row.user_id} className="bg-white/92 px-3 py-3 sm:px-4">
                    <div className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2">
                      <p className="min-w-0 truncate text-sm font-extrabold text-foreground sm:text-base">
                        {row.full_name}
                      </p>
                      <Badge variant="secondary" className="shrink-0">
                        {row.total_points} pts
                      </Badge>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0 rounded-full"
                        onClick={() => showRowDetails(row, index)}
                        aria-label={`Ver detalles de ${row.full_name}`}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[900px] text-left">
                <thead className="bg-primary text-xs font-black uppercase text-primary-foreground">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Participante</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Marcador</th>
                    <th className="px-4 py-3">Goleadores +1</th>
                    <th className="px-4 py-3">Exactos</th>
                    <th className="px-4 py-3">Diferencia</th>
                    <th className="px-4 py-3">Resultado</th>
                    <th className="px-4 py-3">Predicciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((row, index) => (
                    <tr key={row.user_id} className="bg-white/92 transition-colors hover:bg-secondary/10">
                      <td className="px-4 py-3 font-black">
                        <span className="inline-flex items-center gap-2">
                          {index < 3 ? <Medal className="h-4 w-4 text-secondary" /> : null}
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-extrabold">{row.full_name}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{row.total_points} pts</Badge>
                      </td>
                      <td className="px-4 py-3 font-bold">{row.score_points}</td>
                      <td className="px-4 py-3 font-bold">
                        <span className="inline-flex items-center gap-1">
                          <Flag className="h-4 w-4 text-secondary" />
                          {row.scorer_hits}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold">{row.exact_scores}</td>
                      <td className="px-4 py-3 font-bold">{row.goal_differences}</td>
                      <td className="px-4 py-3 font-bold">{row.outcomes}</td>
                      <td className="px-4 py-3 font-bold">{row.predictions_count}</td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function LeaderboardDetailsSnackbar({
  row,
  position,
  onClose,
}: {
  row: LeaderboardRow;
  position: number;
  onClose: () => void;
}) {
  return (
    <div className="w-[min(calc(100vw-2rem),26rem)] rounded-lg border bg-white p-4 text-foreground shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-black uppercase text-primary">
            {position <= 3 ? <Medal className="h-4 w-4 shrink-0 text-secondary" /> : null}
            Puesto #{position}
          </p>
          <p className="mt-1 truncate text-base font-black">{row.full_name}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={onClose}
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-muted-foreground">
        <DetailMetric label="Total" value={`${row.total_points} pts`} />
        <DetailMetric label="Marcador" value={row.score_points} />
        <DetailMetric
          label="Goleadores +1"
          value={row.scorer_hits}
          icon={<Flag className="h-3.5 w-3.5 text-secondary" />}
        />
        <DetailMetric label="Exactos" value={row.exact_scores} />
        <DetailMetric label="Diferencia" value={row.goal_differences} />
        <DetailMetric label="Resultado" value={row.outcomes} />
        <DetailMetric label="Predicciones" value={row.predictions_count} />
      </div>
    </div>
  );
}

function DetailMetric({ label, value, icon }: { label: string; value: number | string; icon?: ReactNode }) {
  return (
    <div className="rounded-md border bg-muted/55 p-2">
      <p className="text-[11px] font-black uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 inline-flex items-center gap-1 text-base font-black text-primary">
        {icon}
        {value}
      </p>
    </div>
  );
}
