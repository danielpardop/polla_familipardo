import { useEffect, useState } from "react";
import { Medal, RefreshCw } from "lucide-react";
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

  return (
    <section className="space-y-5">
      <PageHeader
        title="Tabla de posiciones"
        description="Ranking actualizado desde las predicciones calculadas."
        action={
        <Button variant="outline" size="sm" onClick={loadLeaderboard} disabled={loading}>
          <RefreshCw className="h-4 w-4" />
          Recargar
        </Button>
        }
      />

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <p className="p-5 text-sm font-bold text-muted-foreground">Cargando tabla...</p>
          ) : rows.length === 0 ? (
            <p className="p-5 text-sm font-bold text-muted-foreground">Aun no hay predicciones puntuadas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left">
                <thead className="bg-primary text-xs font-black uppercase text-primary-foreground">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Participante</th>
                    <th className="px-4 py-3">Puntos</th>
                    <th className="px-4 py-3">Exactos</th>
                    <th className="px-4 py-3">Diferencia</th>
                    <th className="px-4 py-3">Resultado</th>
                    <th className="px-4 py-3">Predicciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((row, index) => (
                    <tr key={row.user_id} className="bg-white/80 transition-colors hover:bg-secondary/10">
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
                      <td className="px-4 py-3 font-bold">{row.exact_scores}</td>
                      <td className="px-4 py-3 font-bold">{row.goal_differences}</td>
                      <td className="px-4 py-3 font-bold">{row.outcomes}</td>
                      <td className="px-4 py-3 font-bold">{row.predictions_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
