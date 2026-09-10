// ============================================================
// Session flag: player already said no to camera/mic.
// Stops automatic getUserMedia retries from re-prompting.
// Cleared only after a successful capture or an explicit tap-to-retry.
// ============================================================

const MEDIA_DENIED_KEY = 'whosmarter-media-permission-denied';

export function hasDeniedMediaPermission(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(MEDIA_DENIED_KEY) === '1';
  } catch {
    return false;
  }
}

export function markMediaPermissionDenied(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(MEDIA_DENIED_KEY, '1');
  } catch {
    // Private mode / quota — in-memory ref in useMeshWebRTC still holds.
  }
}

export function clearMediaPermissionDenied(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(MEDIA_DENIED_KEY);
  } catch {
    // Ignore.
  }
}
