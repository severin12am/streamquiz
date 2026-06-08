// ============================================================
// Per-player colours — a stable, distinct colour for every seat so
// players are easy to tell apart everywhere in the UI (scoreboard,
// camera tiles, who-picked-what reveals, voice answers, winner screen).
//
// Colours are assigned by SLOT (0..5) so the same person keeps the same
// colour across the whole match. The palette is tuned to sit nicely on
// the light "lagoon" theme while staying clearly distinguishable.
// ============================================================

export const PLAYER_COLORS = [
  '#2f7d77', // lagoon teal   (slot 0 / host — matches the app accent)
  '#e08a3c', // amber
  '#7b68d6', // violet
  '#d65780', // rose
  '#4f9d57', // green
  '#3b87bd', // blue
] as const;

/** Stable colour for a player based on their seat (0..5, wraps safely). */
export function playerColor(slot: number): string {
  const n = PLAYER_COLORS.length;
  return PLAYER_COLORS[((slot % n) + n) % n];
}

/** First letter of a name, uppercased — for compact colour avatars. */
export function playerInitial(name: string): string {
  const trimmed = (name ?? '').trim();
  return trimmed ? trimmed[0].toUpperCase() : '?';
}
