import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarClock, Check, Flag, Lock, RefreshCw, Save, Trophy } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { api, type Match, type MatchScorerWithPlayer, type Player, type PredictionWithScorers } from "@/lib/api";
import { formatMatchDate } from "@/lib/date";
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
      points: predictions.reduce((sum, prediction) => sum + (prediction.points ?? 0), 0),
    }),
    [futureMatches.length, predictions],
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
    <section className="space-y-5">
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

      <div className="grid gap-3 sm:grid-cols-3">
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
    <div className="flex items-center justify-between rounded-lg border bg-white p-4 shadow-soft">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-black text-primary">{value}</p>
      </div>
      <div className="grid h-10 w-10 place-items-center rounded-md bg-secondary text-primary">
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
        <h2 className="text-lg font-black text-primary">{title}</h2>
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
    <Card className={cn("min-w-0 overflow-hidden", canPredict ? "border-2 border-secondary" : "")}>
      <div className="flag-band h-2" />
      <CardHeader className="bg-secondary/10 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant="secondary">Grupo K</Badge>
          <Badge variant={predictionStatusVariant(match, canPredict)}>{predictionStatusLabel(match, canPredict)}</Badge>
        </div>
        <CardTitle className="flex min-w-0 flex-wrap items-center gap-2 text-xl sm:gap-3 sm:text-2xl md:text-3xl">
          <TeamName name={match.home_team} flag={match.home_flag} />
          <span className="text-muted-foreground">vs</span>
          <TeamName name={match.away_team} flag={match.away_flag} />
        </CardTitle>
        <CardDescription className="flex min-w-0 items-start gap-2 text-sm font-extrabold">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="min-w-0 break-words">{formatMatchDate(match.match_date)} / {match.venue}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-5">
        {match.status === "finished" ? (
          <div className="break-words rounded-md bg-muted p-3 text-sm font-extrabold">
            Resultado final: {match.home_flag} {match.home_team} {formatScore(match.home_goals, match.away_goals)} {match.away_team}{" "}
            {match.away_flag}
          </div>
        ) : null}

        {matchScorers.length > 0 ? <ActualScorers scorers={matchScorers} /> : null}

        <form className="space-y-4" onSubmit={onSave}>
          <ScoreFields match={match} draft={draft} disabled={!canPredict} onScoreChange={onScoreChange} />
          <div className="grid min-w-0 gap-3 lg:grid-cols-2">
            <ScorerSelects
              match={match}
              teamName={match.home_team}
              goals={Number(draft.home) || 0}
              selectedIds={draft.scorers[match.home_team] ?? []}
              players={playersByTeam.get(match.home_team) ?? []}
              disabled={!canPredict}
              onChange={onScorerChange}
            />
            <ScorerSelects
              match={match}
              teamName={match.away_team}
              goals={Number(draft.away) || 0}
              selectedIds={draft.scorers[match.away_team] ?? []}
              players={playersByTeam.get(match.away_team) ?? []}
              disabled={!canPredict}
              onChange={onScorerChange}
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <PredictionSummary prediction={prediction} match={match} playersByTeam={playersByTeam} canPredict={canPredict} />
            <Button type="submit" size="sm" className="w-full sm:w-auto" disabled={!canPredict || saving}>
              {canPredict ? <Save className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              {canPredict ? "Guardar" : "Bloqueado"}
            </Button>
          </div>
        </form>
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
    <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-2 rounded-lg bg-muted/65 p-2 sm:gap-3 sm:p-3">
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
  disabled,
  onChange,
}: {
  match: Match;
  teamName: string;
  goals: number;
  selectedIds: string[];
  players: Player[];
  disabled: boolean;
  onChange: (teamName: string, slotIndex: number, playerId: string) => void;
}) {
  if (goals <= 0) {
    return (
      <div className="min-w-0 break-words rounded-md border bg-white p-3 text-sm font-bold text-muted-foreground">
        {teamName}: sin goles en tu marcador.
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-2 rounded-md border bg-white p-3">
      <p className="break-words text-sm font-black text-primary">{teamName}: goleadores</p>
      {Array.from({ length: goals }, (_, index) => (
        <div key={`${match.id}-${teamName}-${index}`} className="space-y-1">
          <Label htmlFor={`${match.id}-${teamName}-${index}`} className="text-xs">
            Gol {index + 1}
          </Label>
          <select
            id={`${match.id}-${teamName}-${index}`}
            className="flex h-10 w-full min-w-0 rounded-md border border-input bg-white px-3 py-2 text-sm font-extrabold shadow-sm"
            value={selectedIds[index] ?? ""}
            onChange={(event) => onChange(teamName, index, event.target.value)}
            disabled={disabled}
            required
          >
            <option value="">Selecciona jugador</option>
            {players.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

function ActualScorers({ scorers }: { scorers: MatchScorerWithPlayer[] }) {
  return (
    <div className="min-w-0 rounded-md border bg-white p-3">
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

  const playersById = new Map(Array.from(playersByTeam.values()).flat().map((player) => [player.id, player.name]));
  const scorerNames = prediction.scorers
    .slice()
    .sort((a, b) => a.slot_number - b.slot_number)
    .map((scorer) => `${playersById.get(scorer.player_id) ?? "Jugador"} (${scorer.team_name})`);

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

function TeamName({ name, flag }: { name: string; flag: string }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span className="shrink-0 rounded bg-white px-1.5 py-0.5 text-base shadow-sm">{flag}</span>
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
