// Initials for a leaderboard avatar. Guests are named "Guest <Adjective><Animal>", so the
// "Guest" prefix is dropped and the camel-cased name gives two letters ("WildKoala" → "WK").
export function leaderboardInitials(name: string): string {
  const words = name
    .replace(/^Guest\s+/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(/[\s._-]+/)
    .filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}
