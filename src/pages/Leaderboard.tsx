import { useEffect, useState } from "react";
import { Flag, Medal, Plus, RefreshCw, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api, type FinishedPredictionRow, type LeaderboardRow } from "@/lib/api";

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
                  <div key={row.user_id} className="bg-white/92 px-3 py-2.5 sm:px-4">
                    <div className="grid min-h-10 grid-cols-[2.25rem_minmax(0,1fr)_auto_auto] items-center gap-2">
                      <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-muted text-xs font-black text-primary">
                        {index === 0 ? <Medal className="h-3.5 w-3.5 text-secondary" /> : `#${index + 1}`}
                      </div>
                      <p className="min-w-0 truncate text-sm font-extrabold leading-tight text-foreground sm:text-[15px]">
                        {row.full_name}
                      </p>
                      <Badge variant="secondary" className="shrink-0 px-2 py-0.5 text-[11px] sm:text-xs">
                        {row.total_points} pts
                      </Badge>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 shrink-0 rounded-full"
                        onClick={() => showRowDetails(row, index)}
                        aria-label={`Ver detalles de ${row.full_name}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
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
  const [predictions, setPredictions] = useState<FinishedPredictionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadPredictions() {
      try {
        const data = await api.getFinishedPredictionsForUser(row.user_id);
        if (!ignore) setPredictions(data);
      } catch (error) {
        if (!ignore) {
          toast.error(error instanceof Error ? error.message : "No pudimos cargar esas predicciones.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void loadPredictions();

    return () => {
      ignore = true;
    };
  }, [row.user_id]);

  return (
    <div className="w-[min(calc(100vw-2rem),26rem)] rounded-lg border bg-white p-4 text-foreground shadow-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-black uppercase text-primary">
            {position === 1 ? <Medal className="h-4 w-4 shrink-0 text-secondary" /> : null}
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

      {loading ? (
        <p className="mt-3 rounded-md bg-muted/60 p-3 text-xs font-bold text-muted-foreground">Cargando...</p>
      ) : predictions.length === 0 ? (
        <p className="mt-3 rounded-md bg-muted/60 p-3 text-xs font-bold text-muted-foreground">
          Aun no hay predicciones finalizadas para mostrar.
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          {predictions.map((prediction) => (
            <FinishedPredictionItem key={prediction.match_id} prediction={prediction} />
          ))}
        </div>
      )}
    </div>
  );
}

function FinishedPredictionItem({ prediction }: { prediction: FinishedPredictionRow }) {
  const scorers = getPredictionScorers(prediction.scorers);
  const score = `${prediction.home_team} ${prediction.prediction_home_goals}-${prediction.prediction_away_goals} ${prediction.away_team}`;

  return (
    <div className="rounded-md border bg-muted/45 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-black text-primary">{score}</p>
        <Badge variant="secondary" className="shrink-0 px-2 py-0 text-[11px]">
          {prediction.total_points} pts
        </Badge>
      </div>

      {scorers.length > 0 ? (
        <details className="mt-1.5">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-[11px] font-extrabold text-muted-foreground">
            <Flag className="h-3 w-3 text-secondary" />
            Goleadores
            <span className="text-primary">({scorers.length})</span>
          </summary>
          <div className="mt-1 flex flex-wrap gap-1">
            {scorers.map((scorer, index) => (
              <span
                key={`${scorer.team_name}-${scorer.name}-${index}`}
                className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-foreground"
              >
                {scorer.name}
              </span>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

type PredictionScorerSummary = {
  name: string;
  team_name: string;
  slot_number: number;
};

function getPredictionScorers(value: FinishedPredictionRow["scorers"]): PredictionScorerSummary[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return null;
      const scorer = item as Record<string, unknown>;
      if (typeof scorer.name !== "string") return null;

      return {
        name: scorer.name,
        team_name: typeof scorer.team_name === "string" ? scorer.team_name : "",
        slot_number: typeof scorer.slot_number === "number" ? scorer.slot_number : 0,
      };
    })
    .filter((item): item is PredictionScorerSummary => Boolean(item))
    .sort((a, b) => a.slot_number - b.slot_number);
}
