import { cn } from "@/lib/utils";

const teamFlagCodes: Record<string, string> = {
  Colombia: "co",
  Portugal: "pt",
  Uzbekistan: "uz",
  "R. D. del Congo": "cd",
};

export function getTeamFlagCode(teamName: string) {
  return teamFlagCodes[teamName] ?? null;
}

export function CountryFlag({ teamName, className }: { teamName: string; className?: string }) {
  const code = getTeamFlagCode(teamName);

  if (!code) {
    return (
      <span
        className={cn("inline-flex h-5 w-7 shrink-0 items-center justify-center rounded-sm bg-muted text-[10px] font-black text-primary", className)}
        aria-hidden="true"
      >
        --
      </span>
    );
  }

  return (
    <img
      src={`https://flagcdn.com/${code}.svg`}
      alt={`Bandera de ${teamName}`}
      className={cn("h-5 w-7 shrink-0 rounded-sm border border-black/10 bg-white object-cover shadow-sm", className)}
      loading="lazy"
    />
  );
}
