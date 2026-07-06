// ============================================================
// Per-browser identity helpers.
//
// A stable `client_id` (stored in localStorage) lets a player reload
// the page and re-attach to their EXISTING seat in the players table
// instead of grabbing a fresh slot. We also remember the last display
// name so returning players don't have to retype it.
// ============================================================

import type { User } from '@supabase/supabase-js';

const CLIENT_ID_KEY = 'whosmarter-client-id';
const NAME_KEY      = 'whosmarter-player-name';
const MAX_NAME_LEN  = 24;

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

/** Best display name when the host should join without typing one. */
export function resolveDefaultPlayerName(user?: User | null): string {
  const saved = getSavedName().trim();
  if (saved) return saved.slice(0, MAX_NAME_LEN);

  const meta = user?.user_metadata;
  const fromMeta = (
    (typeof meta?.full_name === 'string' && meta.full_name) ||
    (typeof meta?.name === 'string' && meta.name) ||
    ''
  ).trim();
  if (fromMeta) return fromMeta.slice(0, MAX_NAME_LEN);

  const emailLocal = user?.email?.split('@')[0]?.trim();
  if (emailLocal) return emailLocal.slice(0, MAX_NAME_LEN);

  return 'Host';
}
