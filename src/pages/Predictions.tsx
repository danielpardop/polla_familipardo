import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarClock, Check, Flag, Lock, RefreshCw, Save, Trophy } from "lucide-react";
import { toast } from "sonner";
import { CountryFlag } from "@/components/CountryFlag";
import { PageHeader } from "@/components/PageHeader";
import { PlayerCombobox } from "@/components/PlayerCombobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { api, type Match, type MatchScorerWithPlayer, type Player, type PredictionWithScorers } from "@/lib/api";
import { formatMatchDate } from "@/lib/date";
import { playerLabel } from "@/lib/players";
import { cn, formatScore } from "@/lib/utils";

type Draft = {
  home: string;
  away: string;
  scorers: Record<string, string[]>;
};
type Drafts = Record<string, Draft>;

const statusLabels = {
  open: "Abierto",
  closed: "Cerrado",
  finished: "Finalizado",
};

export function Predictions() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matchScorers, setMatchScorers] = useState<MatchScorerWithPlayer[]>([]);
  const [predictions, setPredictions] = useState<PredictionWithScorers[]>([]);
  const [drafts, setDrafts] = useState<Drafts>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const predictionsByMatch = useMemo(
    () => new Map(predictions.map((prediction) => [prediction.match_id, prediction])),
    [predictions],
  );
  const playersByTeam = useMemo(() => groupPlayersByTeam(players), [players]);
  const scorersByMatch = useMemo(() => groupMatchScorersByMatch(matchScorers), [matchScorers]);
  const pastMatches = useMemo(() => matches.filter((match) => !isPredictionOpen(match, nowMs)), [matches, nowMs]);
  const futureMatches = useMemo(() => matches.filter((match) => isPredictionOpen(match, nowMs)), [matches, nowMs]);
  const stats = useMemo(
    () => ({
      pending: futureMatches.length,
      saved: predictions.length,
      points: calculatePredictionPoints(predictions, matchScorers),
    }),
    [futureMatches.length, matchScorers, predictions],
  );

  async function loadData() {
    if (!user) return;
    setLoading(true);
    try {
      const [matchData, playerData, predictionData, scorerData] = await Promise.all([
        api.listMatches(),
        api.listPlayers(),
        api.listMyPredictions(),
        api.listMatchScorers(),
      ]);
      setMatches(matchData);
      setPlayers(playerData);
      setPredictions(predictionData);
      setMatchScorers(scorerData);
      setDrafts(toPredictionDrafts(matchData, predictionData));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No pudimos cargar los partidos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  async function savePrediction(event: FormEvent<HTMLFormElement>, match: Match) {
    event.preventDefault();
    if (!user || !isPredictionOpen(match, nowMs)) return;

    const draft = drafts[match.id];
    const homeGoals = Number(draft?.home);
    const awayGoals = Number(draft?.away);

    if (!Number.isInteger(homeGoals) || !Number.isInteger(awayGoals) || homeGoals < 0 || awayGoals < 0) {
      toast.error("Los goles deben ser numeros enteros desde 0.");
      return;
    }

    const scorerRows = buildScorerRows(match, draft, homeGoals, awayGoals);
    if (!scorerRows) {
      toast.error("Selecciona un goleador por cada gol del marcador.");
      return;
    }

    setSavingId(match.id);
    try {
      const updatedPredictions = await api.savePrediction({
        match_id: match.id,
        home_goals: homeGoals,
        away_goals: awayGoals,
        scorer_player_ids: scorerRows,
      });
      setPredictions(updatedPredictions);
      setDrafts(toPredictionDrafts(matches, updatedPredictions));
      toast.success("Prediccion guardada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No pudimos guardar la prediccion.");
    } finally {
      setSavingId(null);
    }
  }

  function updateScore(match: Match, side: "home" | "away", value: string) {
    const team = side === "home" ? match.home_team : match.away_team;
    const goals = Math.max(0, Number(value) || 0);
    setDrafts((current) => {
      const draft = current[match.id] ?? emptyDraft(match);
      return {
        ...current,
        [match.id]: {
          ...draft,
          [side]: value,
          scorers: {
            ...draft.scorers,
            [team]: resizeScorers(draft.scorers[team] ?? [], goals),
          },
        },
      };
    });
  }

  function updateScorer(match: Match, teamName: string, slotIndex: number, playerId: string) {
    setDrafts((current) => {
      const draft = current[match.id] ?? emptyDraft(match);
      const next = [...(draft.scorers[teamName] ?? [])];
      next[slotIndex] = playerId;
      return {
        ...current,
        [match.id]: {
          ...draft,
          scorers: {
            ...draft.scorers,
            [teamName]: next,
          },
        },
      };
    });
  }

  return (
    <section className="space-y-6">
      <PageHeader
        title="Polla de Colombia"
        description="Partidos de Colombia en el Mundial: resultados jugados y predicciones pendientes."
        action={
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
            Recargar
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3 lg:gap-4">
        <MiniStat label="Pendientes" value={stats.pending} />
        <MiniStat label="Guardadas" value={stats.saved} />
        <MiniStat label="Tus puntos" value={stats.points} />
      </div>

      {loading ? (
        <Card>
          <CardContent className="pt-5 text-sm font-bold text-muted-foreground">Cargando partidos...</CardContent>
        </Card>
      ) : matches.length === 0 ? (
        <Card>
          <CardContent className="pt-5 text-sm font-bold text-muted-foreground">Aun no hay partidos de Colombia.</CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <MatchSection
            title="Partidos pendientes"
            empty="No quedan partidos abiertos para predecir."
            matches={futureMatches}
            predictionsByMatch={predictionsByMatch}
            drafts={drafts}
            playersByTeam={playersByTeam}
            scorersByMatch={scorersByMatch}
            savingId={savingId}
            nowMs={nowMs}
            onScoreChange={updateScore}
            onScorerChange={updateScorer}
            onSave={savePrediction}
          />
          <MatchSection
            title="Partidos jugados"
            empty="Todavia no hay partidos jugados."
            matches={pastMatches}
            predictionsByMatch={predictionsByMatch}
            drafts={drafts}
            playersByTeam={playersByTeam}
            scorersByMatch={scorersByMatch}
            savingId={savingId}
            nowMs={nowMs}
            onScoreChange={updateScore}
            onScorerChange={updateScorer}
            onSave={savePrediction}
          />
        </div>
      )}
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric-tile flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-black text-primary">{value}</p>
      </div>
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-secondary text-primary shadow-sm">
        <Trophy className="h-5 w-5" />
      </div>
    </div>
  );
}

function MatchSection({
  title,
  empty,
  matches,
  predictionsByMatch,
  drafts,
  playersByTeam,
  scorersByMatch,
  savingId,
  nowMs,
  onScoreChange,
  onScorerChange,
  onSave,
}: {
  title: string;
  empty: string;
  matches: Match[];
  predictionsByMatch: Map<string, PredictionWithScorers>;
  drafts: Drafts;
  playersByTeam: Map<string, Player[]>;
  scorersByMatch: Map<string, MatchScorerWithPlayer[]>;
  savingId: string | null;
  nowMs: number;
  onScoreChange: (match: Match, side: "home" | "away", value: string) => void;
  onScorerChange: (match: Match, teamName: string, slotIndex: number, playerId: string) => void;
  onSave: (event: FormEvent<HTMLFormElement>, match: Match) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="section-title">{title}</h2>
        <Badge variant="secondary">{matches.length}</Badge>
      </div>
      {matches.length === 0 ? (
        <Card>
          <CardContent className="pt-5 text-sm font-bold text-muted-foreground">{empty}</CardContent>
        </Card>
      ) : (
        <div className="grid min-w-0 gap-4 xl:grid-cols-2">
          {matches.map((match) => (
            <PredictionCard
              key={match.id}
              match={match}
              prediction={predictionsByMatch.get(match.id)}
              draft={drafts[match.id] ?? emptyDraft(match)}
              playersByTeam={playersByTeam}
              matchScorers={scorersByMatch.get(match.id) ?? []}
              saving={savingId === match.id}
              nowMs={nowMs}
              onScoreChange={(side, value) => onScoreChange(match, side, value)}
              onScorerChange={(teamName, slotIndex, playerId) => onScorerChange(match, teamName, slotIndex, playerId)}
              onSave={(event) => onSave(event, match)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function PredictionCard({
  match,
  prediction,
  draft,
  playersByTeam,
  matchScorers,
  saving,
  nowMs,
  onScoreChange,
  onScorerChange,
  onSave,
}: {
  match: Match;
  prediction?: PredictionWithScorers;
  draft: Draft;
  playersByTeam: Map<string, Player[]>;
  matchScorers: MatchScorerWithPlayer[];
  saving: boolean;
  nowMs: number;
  onScoreChange: (side: "home" | "away", value: string) => void;
  onScorerChange: (teamName: string, slotIndex: number, playerId: string) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const canPredict = isPredictionOpen(match, nowMs);

  return (
    <Card className={cn("min-w-0 overflow-visible", canPredict ? "border-2 border-secondary/80" : "")}>
      <div className="flag-band h-1.5 rounded-t-lg" />
      <CardHeader className="bg-muted/45 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant="secondary">Grupo K</Badge>
          <Badge variant={predictionStatusVariant(match, canPredict)}>{predictionStatusLabel(match, canPredict)}</Badge>
        </div>
        <CardTitle className="flex min-w-0 flex-wrap items-center gap-2 text-xl sm:gap-3 sm:text-2xl">
          <TeamName name={match.home_team} />
          <span className="text-muted-foreground">vs</span>
          <TeamName name={match.away_team} />
        </CardTitle>
        <CardDescription className="flex min-w-0 items-start gap-2 text-sm font-extrabold leading-relaxed">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="min-w-0 break-words">{formatMatchDate(match.match_date)} / {match.venue}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-5">
        {match.status === "finished" ? (
          <div className="break-words rounded-md border bg-muted/70 p-3 text-sm font-extrabold">
            Resultado final: {match.home_team} {formatScore(match.home_goals, match.away_goals)} {match.away_team}
          </div>
        ) : null}

        {matchScorers.length > 0 ? <ActualScorers scorers={matchScorers} /> : null}

        {canPredict ? (
          <form className="space-y-4" onSubmit={onSave}>
            <ScoreFields match={match} draft={draft} disabled={false} onScoreChange={onScoreChange} />
            <div className="grid min-w-0 gap-3 lg:grid-cols-2">
              <ScorerSelects
                match={match}
                teamName={match.home_team}
                goals={Number(draft.home) || 0}
                selectedIds={draft.scorers[match.home_team] ?? []}
                players={playersByTeam.get(match.home_team) ?? []}
                onChange={onScorerChange}
              />
              <ScorerSelects
                match={match}
                teamName={match.away_team}
                goals={Number(draft.away) || 0}
                selectedIds={draft.scorers[match.away_team] ?? []}
                players={playersByTeam.get(match.away_team) ?? []}
                onChange={onScorerChange}
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <PredictionSummary prediction={prediction} match={match} playersByTeam={playersByTeam} canPredict={canPredict} />
              <Button type="submit" size="sm" className="w-full sm:w-auto" disabled={saving}>
                <Save className="h-4 w-4" />
                Guardar
              </Button>
            </div>
          </form>
        ) : (
          <div className="rounded-md border bg-white/90 p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <PredictionSummary prediction={prediction} match={match} playersByTeam={playersByTeam} canPredict={canPredict} />
              <Badge variant="muted">
                <Lock className="mr-1 h-3.5 w-3.5" />
                Solo lectura
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScoreFields({
  match,
  draft,
  disabled,
  onScoreChange,
}: {
  match: Match;
  draft: Draft;
  disabled: boolean;
  onScoreChange: (side: "home" | "away", value: string) => void;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2 rounded-lg border bg-muted/55 p-2 sm:gap-3 sm:p-3">
      <div className="min-w-0 space-y-2">
        <Label className="block truncate text-xs sm:text-sm" htmlFor={`${match.id}-home`}>{match.home_team}</Label>
        <Input
          id={`${match.id}-home`}
          type="number"
          min={0}
          max={20}
          inputMode="numeric"
          value={draft.home}
          className="score-input"
          onChange={(event) => onScoreChange("home", event.target.value)}
          disabled={disabled}
          required
        />
      </div>
      <span className="pb-2 text-lg font-black text-muted-foreground sm:text-xl">-</span>
      <div className="min-w-0 space-y-2">
        <Label className="block truncate text-xs sm:text-sm" htmlFor={`${match.id}-away`}>{match.away_team}</Label>
        <Input
          id={`${match.id}-away`}
          type="number"
          min={0}
          max={20}
          inputMode="numeric"
          value={draft.away}
          className="score-input"
          onChange={(event) => onScoreChange("away", event.target.value)}
          disabled={disabled}
          required
        />
      </div>
    </div>
  );
}

function ScorerSelects({
  match,
  teamName,
  goals,
  selectedIds,
  players,
  onChange,
}: {
  match: Match;
  teamName: string;
  goals: number;
  selectedIds: string[];
  players: Player[];
  onChange: (teamName: string, slotIndex: number, playerId: string) => void;
}) {
  if (goals <= 0) {
    return (
      <div className="min-w-0 break-words rounded-md border bg-white/90 p-3 text-sm font-bold text-muted-foreground">
        {teamName}: sin goles en tu marcador.
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-2 rounded-md border bg-white/90 p-3">
      <p className="break-words text-sm font-black text-primary">{teamName}: goleadores</p>
      {Array.from({ length: goals }, (_, index) => (
        <div key={`${match.id}-${teamName}-${index}`} className="space-y-1">
          <Label htmlFor={`${match.id}-${teamName}-${index}`} className="text-xs">
            Gol {index + 1}
          </Label>
          <PlayerCombobox
            id={`${match.id}-${teamName}-${index}`}
            players={players}
            value={selectedIds[index] ?? ""}
            placeholder="Buscar jugador"
            onChange={(playerId) => onChange(teamName, index, playerId)}
          />
        </div>
      ))}
    </div>
  );
}

function ActualScorers({ scorers }: { scorers: MatchScorerWithPlayer[] }) {
  return (
    <div className="min-w-0 rounded-md border bg-white/90 p-3">
      <p className="mb-2 flex items-center gap-2 text-sm font-black text-primary">
        <Flag className="h-4 w-4" />
        Goleadores reales
      </p>
      <div className="flex flex-wrap gap-2">
        {scorers.map((scorer) => (
          <Badge key={scorer.id} variant="muted">
            {scorer.player?.name ?? "Jugador"} {scorer.minute ? `${scorer.minute}'` : ""} / {scorer.team_name}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function PredictionSummary({
  prediction,
  match,
  playersByTeam,
  canPredict,
}: {
  prediction?: PredictionWithScorers;
  match: Match;
  playersByTeam: Map<string, Player[]>;
  canPredict: boolean;
}) {
  if (!prediction) {
    return <div className="text-sm font-bold text-muted-foreground">{canPredict ? "Sin prediccion" : "Apuesta no realizada / 0 pts"}</div>;
  }

  const playersById = new Map(Array.from(playersByTeam.values()).flat().map((player) => [player.id, playerLabel(player)]));
  const scorerNames = prediction.scorers
    .slice()
    .sort((a, b) => a.slot_number - b.slot_number)
    .map((scorer) => `${playersById.get(scorer.player_id) ?? "Jugador"} / ${scorer.team_name}`);

  return (
    <div className="min-w-0 space-y-1 text-sm font-bold text-muted-foreground">
      <span className="flex min-w-0 flex-wrap items-center gap-1">
        <Check className="h-4 w-4 shrink-0 text-primary" />
        Tu prediccion: {match.home_team} {prediction.home_goals} - {prediction.away_goals} {match.away_team}
        {match.status === "finished" ? ` / ${prediction.points ?? 0} pts` : ""}
      </span>
      {scorerNames.length > 0 ? <p className="break-words text-xs">Goles: {scorerNames.join(", ")}</p> : null}
    </div>
  );
}

function TeamName({ name }: { name: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <CountryFlag teamName={name} />
      <span className="min-w-0 break-words">{name}</span>
    </span>
  );
}

function isPredictionOpen(match: Match, nowMs: number) {
  return match.status === "open" && new Date(match.match_date).getTime() > nowMs;
}

function predictionStatusLabel(match: Match, canPredict: boolean) {
  if (match.status === "open" && !canPredict) return "Bloqueado";
  return statusLabels[match.status];
}

function predictionStatusVariant(match: Match, canPredict: boolean) {
  if (match.status === "open" && canPredict) return "secondary";
  if (match.status === "finished") return "accent";
  return "muted";
}

function emptyDraft(match: Match): Draft {
  return {
    home: "",
    away: "",
    scorers: {
      [match.home_team]: [],
      [match.away_team]: [],
    },
  };
}

function resizeScorers(current: string[], goals: number) {
  return Array.from({ length: goals }, (_, index) => current[index] ?? "");
}

function toPredictionDrafts(matches: Match[], predictions: PredictionWithScorers[]): Drafts {
  return Object.fromEntries(
    matches.map((match) => {
      const prediction = predictions.find((item) => item.match_id === match.id);
      const draft = emptyDraft(match);
      if (!prediction) return [match.id, draft];

      const homeScorers = prediction.scorers
        .filter((scorer) => scorer.team_name === match.home_team)
        .sort((a, b) => a.slot_number - b.slot_number)
        .map((scorer) => scorer.player_id);
      const awayScorers = prediction.scorers
        .filter((scorer) => scorer.team_name === match.away_team)
        .sort((a, b) => a.slot_number - b.slot_number)
        .map((scorer) => scorer.player_id);

      return [
        match.id,
        {
          home: prediction.home_goals.toString(),
          away: prediction.away_goals.toString(),
          scorers: {
            [match.home_team]: resizeScorers(homeScorers, prediction.home_goals),
            [match.away_team]: resizeScorers(awayScorers, prediction.away_goals),
          },
        },
      ];
    }),
  );
}

function buildScorerRows(match: Match, draft: Draft, homeGoals: number, awayGoals: number) {
  const homeIds = resizeScorers(draft.scorers[match.home_team] ?? [], homeGoals);
  const awayIds = resizeScorers(draft.scorers[match.away_team] ?? [], awayGoals);

  if ([...homeIds, ...awayIds].some((playerId) => !playerId)) return null;

  return [
    ...homeIds.map((playerId, index) => ({ team_name: match.home_team, player_id: playerId, slot_number: index + 1 })),
    ...awayIds.map((playerId, index) => ({ team_name: match.away_team, player_id: playerId, slot_number: index + 1 })),
  ];
}

function groupPlayersByTeam(players: Player[]) {
  const map = new Map<string, Player[]>();
  for (const player of players) {
    map.set(player.team_name, [...(map.get(player.team_name) ?? []), player]);
  }
  return map;
}

function groupMatchScorersByMatch(scorers: MatchScorerWithPlayer[]) {
  const map = new Map<string, MatchScorerWithPlayer[]>();
  for (const scorer of scorers) {
    map.set(scorer.match_id, [...(map.get(scorer.match_id) ?? []), scorer]);
  }
  return map;
}

function calculatePredictionPoints(predictions: PredictionWithScorers[], matchScorers: MatchScorerWithPlayer[]) {
  const actualCounts = new Map<string, number>();
  for (const scorer of matchScorers) {
    const key = `${scorer.match_id}:${scorer.player_id}`;
    actualCounts.set(key, (actualCounts.get(key) ?? 0) + 1);
  }

  return predictions.reduce((sum, prediction) => {
    const predictedCounts = new Map<string, number>();
    for (const scorer of prediction.scorers) {
      const key = `${prediction.match_id}:${scorer.player_id}`;
      predictedCounts.set(key, (predictedCounts.get(key) ?? 0) + 1);
    }

    let scorerHits = 0;
    for (const [key, predictedCount] of predictedCounts) {
      scorerHits += Math.min(predictedCount, actualCounts.get(key) ?? 0);
    }

    return sum + (prediction.points ?? 0) + scorerHits;
  }, 0);
}
