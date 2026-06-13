// ============================================================
// Per-browser identity helpers.
//
// A stable `client_id` (stored in localStorage) lets a player reload
// the page and re-attach to their EXISTING seat in the players table
// instead of grabbing a fresh slot. We also remember the last display
// name so returning players don't have to retype it.
// ============================================================

const CLIENT_ID_KEY = 'whosmarter-client-id';
const NAME_KEY      = 'whosmarter-player-name';

/** Stable id for THIS browser. Created once, then reused forever. */
export function getClientId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `c_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

/** Last display name this browser used (so we can prefill it). */
export function getSavedName(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(NAME_KEY) ?? '';
}

export function saveName(name: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NAME_KEY, name.trim());
}
