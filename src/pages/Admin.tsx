import { FormEvent, useEffect, useMemo, useState } from "react";
import { ListChecks, Lock, RefreshCw, ShieldCheck, Trophy, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { CountryFlag } from "@/components/CountryFlag";
import { PageHeader } from "@/components/PageHeader";
import { PlayerCombobox } from "@/components/PlayerCombobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { api, type AdminUser, type Match, type MatchScorerWithPlayer, type Player } from "@/lib/api";
import { formatMatchDate } from "@/lib/date";
import { formatScore } from "@/lib/utils";

type ResultDraft = {
  home: string;
  away: string;
  scorers: Record<string, { player_id: string; minute: string }[]>;
};

type ResultDrafts = Record<string, ResultDraft>;

const statusLabels = {
  open: "Abierto",
  closed: "Cerrado",
  finished: "Finalizado",
};

export function Admin() {
  const { user } = useAuth();
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matchScorers, setMatchScorers] = useState<MatchScorerWithPlayer[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [drafts, setDrafts] = useState<ResultDrafts>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const playersByTeam = useMemo(() => groupPlayersByTeam(players), [players]);
  const scorersByMatch = useMemo(() => groupMatchScorersByMatch(matchScorers), [matchScorers]);

  async function loadData() {
    setLoading(true);
    try {
      const [matchData, playerData, scorerData, userData] = await Promise.all([
        api.listMatches(),
        api.listPlayers(),
        api.listMatchScorers(),
        api.listAdminUsers(),
      ]);
      setMatches(matchData);
      setPlayers(playerData);
      setMatchScorers(scorerData);
      setUsers(userData);
      setDrafts(toResultDrafts(matchData, scorerData));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No pudimos cargar admin.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function closeMatch(match: Match) {
    if (match.status === "finished") return;
    setSavingId(match.id);
    try {
      await api.updateMatch(match.id, { status: "closed" });
      toast.success("Predicciones cerradas.");
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No pudimos cerrar el partido.");
    } finally {
      setSavingId(null);
    }
  }

  async function reopenMatch(match: Match) {
    if (match.status === "finished") return;
    setSavingId(match.id);
    try {
      await api.updateMatch(match.id, { status: "open", home_goals: null, away_goals: null });
      await api.replaceMatchScorers(match.id, []);
      toast.success("Partido abierto.");
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No pudimos abrir el partido.");
    } finally {
      setSavingId(null);
    }
  }

  async function finishMatch(event: FormEvent<HTMLFormElement>, match: Match) {
    event.preventDefault();
    if (match.status === "finished") return;
    const draft = drafts[match.id] ?? emptyResultDraft(match);
    const homeGoals = Number(draft.home);
    const awayGoals = Number(draft.away);

    if (!Number.isInteger(homeGoals) || !Number.isInteger(awayGoals) || homeGoals < 0 || awayGoals < 0) {
      toast.error("Ingresa marcadores validos.");
      return;
    }

    const scorerRows = buildActualScorers(match, draft, homeGoals, awayGoals);
    if (!scorerRows) {
      toast.error("Selecciona un goleador por cada gol real.");
      return;
    }

    setSavingId(match.id);
    try {
      await api.updateMatch(match.id, {
        home_goals: homeGoals,
        away_goals: awayGoals,
        status: "finished",
      });
      await api.replaceMatchScorers(match.id, scorerRows);
      toast.success("Resultado guardado y puntos calculados.");
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No pudimos finalizar el partido.");
    } finally {
      setSavingId(null);
    }
  }

  function updateScore(match: Match, side: "home" | "away", value: string) {
    if (match.status === "finished") return;
    const team = side === "home" ? match.home_team : match.away_team;
    const goals = Math.max(0, Number(value) || 0);
    setDrafts((current) => {
      const draft = current[match.id] ?? emptyResultDraft(match);
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

  function updateScorer(match: Match, teamName: string, slotIndex: number, field: "player_id" | "minute", value: string) {
    if (match.status === "finished") return;
    setDrafts((current) => {
      const draft = current[match.id] ?? emptyResultDraft(match);
      const next = [...(draft.scorers[teamName] ?? [])];
      next[slotIndex] = { ...(next[slotIndex] ?? { player_id: "", minute: "" }), [field]: value };
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

  async function setUserAdmin(userId: string, isAdmin: boolean) {
    setSavingId(userId);
    try {
      await api.setAdminRole(userId, isAdmin);
      toast.success(isAdmin ? "Usuario marcado como admin." : "Usuario marcado como participante.");
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No pudimos actualizar el usuario.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <section className="space-y-5">
      <PageHeader
        title="Panel admin"
        description="Cierra partidos y carga resultados reales de Colombia."
        action={
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className="h-4 w-4" />
            Recargar
          </Button>
        }
      />

      {loading ? (
        <Card>
          <CardContent className="pt-5 text-sm font-bold text-muted-foreground">Cargando...</CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="matches">
          <TabsList className="grid w-full grid-cols-2 md:w-auto">
            <TabsTrigger value="matches" className="gap-2">
              <ListChecks className="h-4 w-4" />
              Partidos
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <UsersRound className="h-4 w-4" />
              Usuarios
            </TabsTrigger>
          </TabsList>
          <TabsContent value="matches">
            <div className="grid min-w-0 gap-4 xl:grid-cols-2">
              {matches.map((match) => (
                <MatchAdminCard
                  key={match.id}
                  match={match}
                  draft={drafts[match.id]}
                  saving={savingId === match.id}
                  playersByTeam={playersByTeam}
                  scorers={scorersByMatch.get(match.id) ?? []}
                  onClose={closeMatch}
                  onReopen={reopenMatch}
                  onFinish={finishMatch}
                  onScoreChange={updateScore}
                  onScorerChange={updateScorer}
                />
              ))}
            </div>
          </TabsContent>
          <TabsContent value="users">
            <UsersAdmin users={users} currentUserId={user?.id ?? null} savingId={savingId} onSetAdmin={setUserAdmin} />
          </TabsContent>
        </Tabs>
      )}
    </section>
  );
}

function MatchAdminCard({
  match,
  draft,
  saving,
  playersByTeam,
  scorers,
  onClose,
  onReopen,
  onFinish,
  onScoreChange,
  onScorerChange,
}: {
  match: Match;
  draft?: ResultDraft;
  saving: boolean;
  playersByTeam: Map<string, Player[]>;
  scorers: MatchScorerWithPlayer[];
  onClose: (match: Match) => void;
  onReopen: (match: Match) => void;
  onFinish: (event: FormEvent<HTMLFormElement>, match: Match) => void;
  onScoreChange: (match: Match, side: "home" | "away", value: string) => void;
  onScorerChange: (match: Match, teamName: string, slotIndex: number, field: "player_id" | "minute", value: string) => void;
}) {
  const isFinished = match.status === "finished";

  return (
    <Card className="min-w-0 overflow-visible">
      <div className="flag-band h-1" />
      <CardHeader className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <CardTitle className="flex flex-wrap items-center gap-2 break-words text-base sm:text-lg">
              <CountryFlag teamName={match.home_team} />
              <span>{match.home_team}</span>
              <span className="text-muted-foreground">vs</span>
              <span>{match.away_team}</span>
              <CountryFlag teamName={match.away_team} />
            </CardTitle>
            <CardDescription className="break-words">
              {formatMatchDate(match.match_date)} / {match.venue}
            </CardDescription>
          </div>
          <Badge variant={match.status === "open" ? "secondary" : match.status === "finished" ? "accent" : "muted"}>
            {statusLabels[match.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="break-words rounded-md bg-muted/75 p-3 text-sm font-extrabold">
          Resultado actual: {match.home_team} {formatScore(match.home_goals, match.away_goals)} {match.away_team}
        </div>

        {scorers.length ? (
          <div className="flex flex-wrap gap-2">
            {scorers.map((scorer) => (
              <Badge key={scorer.id} variant="muted">
                {scorer.player?.name ?? "Jugador"} {scorer.minute ? `${scorer.minute}'` : ""} / {scorer.team_name}
              </Badge>
            ))}
          </div>
        ) : null}

        {isFinished ? (
          <div className="rounded-md border bg-white p-3 text-sm font-bold text-muted-foreground">
            Partido finalizado. Bloqueado en modo solo lectura.
          </div>
        ) : (
          <form className="space-y-4" onSubmit={(event) => onFinish(event, match)}>
            <div className="grid min-w-0 gap-3 rounded-lg border bg-white p-3 sm:grid-cols-2">
              <ScoreInput match={match} side="home" value={draft?.home ?? ""} onChange={onScoreChange} />
              <ScoreInput match={match} side="away" value={draft?.away ?? ""} onChange={onScoreChange} />
            </div>

            <div className="grid min-w-0 gap-3 lg:grid-cols-2">
              <ScorerInputs
                match={match}
                teamName={match.home_team}
                goals={Number(draft?.home) || 0}
                selected={draft?.scorers[match.home_team] ?? []}
                players={playersByTeam.get(match.home_team) ?? []}
                onChange={onScorerChange}
              />
              <ScorerInputs
                match={match}
                teamName={match.away_team}
                goals={Number(draft?.away) || 0}
                selected={draft?.scorers[match.away_team] ?? []}
                players={playersByTeam.get(match.away_team) ?? []}
                onChange={onScorerChange}
              />
            </div>

            <div className="grid gap-2 sm:flex sm:flex-wrap">
              <Button className="w-full sm:w-auto" variant="outline" type="button" size="sm" onClick={() => onClose(match)} disabled={match.status !== "open" || saving}>
                <Lock className="h-4 w-4" />
                Cerrar
              </Button>
              <Button className="w-full sm:w-auto" variant="secondary" type="button" size="sm" onClick={() => onReopen(match)} disabled={saving}>
                Abrir
              </Button>
              <Button className="w-full sm:w-auto" variant="accent" type="submit" size="sm" disabled={saving}>
                <Trophy className="h-4 w-4" />
                Finalizar
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function UsersAdmin({
  users,
  currentUserId,
  savingId,
  onSetAdmin,
}: {
  users: AdminUser[];
  currentUserId: string | null;
  savingId: string | null;
  onSetAdmin: (userId: string, isAdmin: boolean) => void;
}) {
  if (users.length === 0) {
    return (
      <Card>
        <CardContent className="pt-5 text-sm font-bold text-muted-foreground">Aun no hay usuarios registrados.</CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="flag-band h-1" />
      <CardHeader className="p-4 sm:p-5">
        <CardTitle>Usuarios</CardTitle>
        <CardDescription>Gestiona participantes registrados y permisos de admin.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 p-4 sm:p-5">
        {users.map((item) => (
          <div key={item.id} className="grid gap-3 rounded-md border bg-white p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="min-w-0">
              <p className="break-words text-sm font-black text-primary">{item.full_name || "Sin nombre"}</p>
              <p className="break-words text-xs font-bold text-muted-foreground">{item.email}</p>
            </div>
            <div className="grid gap-2 sm:flex sm:items-center">
              <Badge variant={item.is_admin ? "accent" : "secondary"}>{item.is_admin ? "Admin" : "Participante"}</Badge>
              <Button
                variant={item.is_admin ? "outline" : "secondary"}
                size="sm"
                className="w-full sm:w-auto"
                disabled={savingId === item.id || item.id === currentUserId}
                onClick={() => onSetAdmin(item.id, !item.is_admin)}
              >
                <ShieldCheck className="h-4 w-4" />
                {item.is_admin ? "Quitar admin" : "Hacer admin"}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ScoreInput({
  match,
  side,
  value,
  onChange,
}: {
  match: Match;
  side: "home" | "away";
  value: string;
  onChange: (match: Match, side: "home" | "away", value: string) => void;
}) {
  const teamName = side === "home" ? match.home_team : match.away_team;
  return (
    <div className="min-w-0 space-y-2">
      <Label className="block truncate text-xs sm:text-sm" htmlFor={`${match.id}-${side}`}>Goles {teamName}</Label>
      <Input
        id={`${match.id}-${side}`}
        type="number"
        min={0}
        max={20}
        value={value}
        className="score-input"
        onChange={(event) => onChange(match, side, event.target.value)}
        required
      />
    </div>
  );
}

function ScorerInputs({
  match,
  teamName,
  goals,
  selected,
  players,
  onChange,
}: {
  match: Match;
  teamName: string;
  goals: number;
  selected: { player_id: string; minute: string }[];
  players: Player[];
  onChange: (match: Match, teamName: string, slotIndex: number, field: "player_id" | "minute", value: string) => void;
}) {
  if (goals <= 0) {
    return <div className="min-w-0 break-words rounded-md border bg-white p-3 text-sm font-bold text-muted-foreground">{teamName}: sin goles.</div>;
  }

  return (
    <div className="min-w-0 space-y-2 rounded-md border bg-white p-3">
      <p className="break-words text-sm font-black text-primary">{teamName}: goleadores reales</p>
      {Array.from({ length: goals }, (_, index) => (
        <div key={`${match.id}-${teamName}-${index}`} className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_90px]">
          <PlayerCombobox
            id={`${match.id}-${teamName}-${index}-admin`}
            players={players}
            value={selected[index]?.player_id ?? ""}
            placeholder={`Gol ${index + 1}: jugador`}
            onChange={(playerId) => onChange(match, teamName, index, "player_id", playerId)}
          />
          <Input
            type="number"
            min={1}
            max={130}
            placeholder="Min"
            value={selected[index]?.minute ?? ""}
            onChange={(event) => onChange(match, teamName, index, "minute", event.target.value)}
          />
        </div>
      ))}
    </div>
  );
}

function emptyResultDraft(match: Match): ResultDraft {
  return {
    home: match.home_goals?.toString() ?? "",
    away: match.away_goals?.toString() ?? "",
    scorers: {
      [match.home_team]: [],
      [match.away_team]: [],
    },
  };
}

function resizeScorers(current: { player_id: string; minute: string }[], goals: number) {
  return Array.from({ length: goals }, (_, index) => current[index] ?? { player_id: "", minute: "" });
}

function toResultDrafts(matches: Match[], scorers: MatchScorerWithPlayer[]): ResultDrafts {
  const scorersByMatch = groupMatchScorersByMatch(scorers);
  return Object.fromEntries(
    matches.map((match) => {
      const draft = emptyResultDraft(match);
      for (const scorer of scorersByMatch.get(match.id) ?? []) {
        const current = draft.scorers[scorer.team_name] ?? [];
        current.push({ player_id: scorer.player_id, minute: scorer.minute?.toString() ?? "" });
        draft.scorers[scorer.team_name] = current;
      }
      draft.scorers[match.home_team] = resizeScorers(draft.scorers[match.home_team] ?? [], match.home_goals ?? 0);
      draft.scorers[match.away_team] = resizeScorers(draft.scorers[match.away_team] ?? [], match.away_goals ?? 0);
      return [match.id, draft];
    }),
  );
}

function buildActualScorers(match: Match, draft: ResultDraft, homeGoals: number, awayGoals: number) {
  const homeScorers = resizeScorers(draft.scorers[match.home_team] ?? [], homeGoals);
  const awayScorers = resizeScorers(draft.scorers[match.away_team] ?? [], awayGoals);
  if ([...homeScorers, ...awayScorers].some((scorer) => !scorer.player_id)) return null;
  return [
    ...homeScorers.map((scorer) => ({
      player_id: scorer.player_id,
      team_name: match.home_team,
      minute: scorer.minute ? Number(scorer.minute) : null,
    })),
    ...awayScorers.map((scorer) => ({
      player_id: scorer.player_id,
      team_name: match.away_team,
      minute: scorer.minute ? Number(scorer.minute) : null,
    })),
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
