import { useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { Player } from "@/lib/api";
import { playerLabel, sortPlayersForScorerSelect } from "@/lib/players";
import { cn } from "@/lib/utils";

export function PlayerCombobox({
  id,
  players,
  value,
  disabled,
  placeholder = "Buscar jugador",
  onChange,
}: {
  id: string;
  players: Player[];
  value: string;
  disabled?: boolean;
  placeholder?: string;
  onChange: (playerId: string) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selectedPlayer = players.find((player) => player.id === value);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const visiblePlayers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const sorted = sortPlayersForScorerSelect(players);
    if (!normalized) return sorted;
    return sorted.filter((player) => playerLabel(player).toLowerCase().includes(normalized));
  }, [players, query]);

  function closeSoon() {
    window.setTimeout(() => {
      if (!wrapperRef.current?.contains(document.activeElement)) {
        setOpen(false);
        setQuery("");
      }
    }, 120);
  }

  return (
    <div ref={wrapperRef} className="relative min-w-0" onBlur={closeSoon}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id={id}
          className="h-11 w-full rounded-md border border-input bg-white py-2 pl-9 pr-3 text-sm font-extrabold shadow-sm outline-none transition focus:border-primary/45 focus:ring-2 focus:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-60"
          value={open ? query : selectedPlayer ? playerLabel(selectedPlayer) : ""}
          placeholder={selectedPlayer ? playerLabel(selectedPlayer) : placeholder}
          disabled={disabled}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          autoComplete="off"
        />
      </div>
      {open && !disabled ? (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-white p-1 shadow-lg ring-1 ring-black/5">
          {visiblePlayers.length === 0 ? (
            <div className="px-3 py-2 text-sm font-bold text-muted-foreground">Sin resultados</div>
          ) : (
            visiblePlayers.map((player) => (
              <button
                key={player.id}
                type="button"
                className={cn(
                  "flex w-full min-w-0 flex-col rounded px-3 py-2 text-left text-sm hover:bg-muted",
                  player.id === value && "bg-secondary/35",
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(player.id);
                  setQuery("");
                  setOpen(false);
                }}
              >
                <span className="truncate font-black text-primary">{player.name}</span>
                <span className="text-xs font-bold text-muted-foreground">{player.position}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
