'use client';

import { useEffect } from 'react';
import { sendTelemetry } from '@/lib/telemetry';
import type { PageHitPath } from '@/lib/telemetry-shared';

/**
 * One anonymous page-load count per browser tab session per path.
 * No cookie, no client id — sessionStorage is only a de-dupe so refresh
 * / React Strict Mode do not inflate the counter.
 */
export function usePageHit(path: PageHitPath): void {
  useEffect(() => {
    try {
      const key = `whosmarter_page_hit_${path}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      /* private mode: still send once for this mount */
    }
    sendTelemetry({ event: 'page_hit', platform: 'web', status: path });
  }, [path]);
}

export function PageHit({ path }: { path: PageHitPath }) {
  usePageHit(path);
  return null;
}
