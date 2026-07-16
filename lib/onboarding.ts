// ============================================================
// First-visit onboarding flag (browser-local).
// Shown once on the home page for signed-out visitors.
// ============================================================

const ONBOARDING_KEY = 'whosmarter-onboarding-done';

export function hasCompletedOnboarding(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(ONBOARDING_KEY) === '1';
  } catch {
    return true;
  }
}

export function markOnboardingCompleted(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ONBOARDING_KEY, '1');
  } catch {
    // Ignore quota / private-mode failures — worst case it shows again.
  }
}
