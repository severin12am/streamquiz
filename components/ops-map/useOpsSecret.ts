'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

export const OPS_SECRET_KEY = 'whosmarter_ops_dashboard_secret';

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function readSecret(): string {
  if (typeof window === 'undefined') return '';
  const fromUrl = new URLSearchParams(window.location.search).get('key');
  const stored = sessionStorage.getItem(OPS_SECRET_KEY);
  return (fromUrl || stored || '').trim();
}

export function persistOpsSecret(key: string) {
  const trimmed = key.trim();
  if (!trimmed) return;
  sessionStorage.setItem(OPS_SECRET_KEY, trimmed);
  emit();
}

export function useOpsSecret() {
  const secret = useSyncExternalStore(subscribe, readSecret, () => '');
  const [draft, setDraft] = useState('');

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('key');
    if (!fromUrl) return;
    persistOpsSecret(fromUrl);
    const url = new URL(window.location.href);
    url.searchParams.delete('key');
    window.history.replaceState({}, '', url.pathname + url.search);
  }, []);

  const unlock = useCallback((key: string) => {
    persistOpsSecret(key);
  }, []);

  return {
    secret,
    draft: draft || secret,
    setDraft,
    unlocked: Boolean(secret),
    ready: true,
    unlock,
  };
}
