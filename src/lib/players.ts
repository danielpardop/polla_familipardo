import type { Player } from "@/lib/api";

const positionOrder: Record<string, number> = {
  Delantero: 1,
  Mediocampista: 2,
  Defensa: 3,
  Arquero: 4,
};

export function playerLabel(player: Pick<Player, "name" | "position">) {
  return `${player.name} - (${player.position || "Sin posicion"})`;
}

export function sortPlayersForScorerSelect(players: Player[]) {
  return [...players].sort((a, b) => {
    const byPosition = (positionOrder[a.position] ?? 99) - (positionOrder[b.position] ?? 99);
    if (byPosition !== 0) return byPosition;
    return a.name.localeCompare(b.name, "es");
  });
}
