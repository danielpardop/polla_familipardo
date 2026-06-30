const teamFlagCodes: Record<string, string> = {
  Colombia: "co",
  Ghana: "gh",
  Portugal: "pt",
  Uzbekistan: "uz",
  "R. D. del Congo": "cd",
};

export function getTeamFlagCode(teamName: string) {
  return teamFlagCodes[teamName] ?? null;
}
