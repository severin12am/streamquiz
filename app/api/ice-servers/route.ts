// ============================================================
// API Route: GET /api/ice-servers
//
// Returns the list of ICE servers (STUN + TURN) every client (web, iOS,
// native Swift) uses to connect cameras/audio. Computed on the server so
// TURN credentials are never baked into a client bundle, and so we can
// decide the relay strategy centrally without shipping a new app build.
//
// RELAY STRATEGY (cost control):
//   Direct peer-to-peer is always preferred automatically by WebRTC (host/
//   srflx candidates outrank relay), so STUN is always included. When a
//   relay IS needed (common on iPhone/cellular/VPN behind carrier-grade NAT)
//   we want it to go through OUR self-hosted coturn VPS (flat monthly cost,
//   not metered), and we want Metered.ca used ONLY as an emergency backup if
//   our coturn box is down.
//
//   IMPORTANT: WebRTC does NOT treat the iceServers array as an ordered
//   fallback list — if we returned BOTH coturn and Metered, both relays would
//   compete on every call and Metered would silently relay (and bill) some of
//   them even while coturn is healthy. To make Metered a TRUE backup, we
//   health-check coturn HERE and return Metered only when coturn is
//   unreachable. The client fetches this route fresh per connection
//   (cache: 'no-store'), so the decision is always current.
//
// ---- ENV VARS (Netlify → Site configuration → Environment variables) ----
//   Our coturn (primary relay) — ALL THREE REQUIRED:
//     TURN_URLS        = turn:62.238.37.7:3478?transport=udp,turn:62.238.37.7:3478?transport=tcp
//     TURN_USERNAME    = whosmarter
//     TURN_CREDENTIAL  = <password matching coturn user= line on VPS>
//   Optional health-check override (else parsed from first TURN_URLS entry):
//     TURN_HEALTHCHECK_HOST = 62.238.37.7
//     TURN_HEALTHCHECK_PORT = 3478
//   Metered (emergency fallback only — keep configured):
//     METERED_DOMAIN   = <subdomain>.metered.live
//     METERED_API_KEY  = <api key>
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import net from 'net';
import { insertTelemetryEvent } from '@/lib/telemetry-server';
import { platformFromClientHeader, type RelayPool } from '@/lib/telemetry-shared';

// net.connect needs the Node.js runtime (not Edge), and the relay decision
// must never be cached.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STUN = { urls: 'stun:stun.l.google.com:19302' };

const FALLBACK_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

function parseHostPort(turnUrl: string): { host: string; port: number } | null {
  const noScheme = turnUrl.replace(/^turns?:/i, '').split('?')[0];
  const lastColon = noScheme.lastIndexOf(':');
  if (lastColon === -1) return null;
  const host = noScheme.slice(0, lastColon).trim();
  const port = Number(noScheme.slice(lastColon + 1));
  if (!host || !Number.isFinite(port)) return null;
  return { host, port };
}

function tcpReachable(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (ok: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

async function getMeteredIceServers(): Promise<unknown[] | null> {
  const meteredKey = process.env.METERED_API_KEY;
  const meteredDomain = process.env.METERED_DOMAIN;
  if (!meteredKey || !meteredDomain) return null;
  try {
    const res = await fetch(
      `https://${meteredDomain}/api/v1/turn/credentials?apiKey=${meteredKey}`,
      { cache: 'no-store' },
    );
    if (res.ok) {
      const iceServers = await res.json();
      if (Array.isArray(iceServers) && iceServers.length > 0) return iceServers;
    }
    console.error('[ice-servers] Metered returned unexpected response');
  } catch (err) {
    console.error('[ice-servers] Metered fetch failed:', err);
  }
  return null;
}

/** Always record Metered fallback; sample healthy coturn/stun (~15%) to limit volume. */
function noteIcePool(req: NextRequest, relay_pool: RelayPool) {
  if (relay_pool !== 'metered' && Math.random() > 0.15) return;
  void insertTelemetryEvent({
    event: 'ice_config_served',
    platform: platformFromClientHeader(req.headers.get('x-whosmarter-client')),
    relay_provider: relay_pool,
    meta: { relay_pool },
  });
}

export async function GET(req: NextRequest) {
  const turnUrls = process.env.TURN_URLS;
  const turnUser = process.env.TURN_USERNAME;
  const turnCred = process.env.TURN_CREDENTIAL;
  const coturnConfigured = Boolean(turnUrls && turnUser && turnCred);

  if (coturnConfigured) {
    const urls = turnUrls!
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean);
    const coturn = { urls, username: turnUser!, credential: turnCred! };

    const probe = process.env.TURN_HEALTHCHECK_HOST
      ? {
          host: process.env.TURN_HEALTHCHECK_HOST,
          port: Number(process.env.TURN_HEALTHCHECK_PORT ?? 3478),
        }
      : parseHostPort(urls[0] ?? '');

    const coturnUp = probe ? await tcpReachable(probe.host, probe.port) : true;

    if (coturnUp) {
      noteIcePool(req, 'coturn');
      return NextResponse.json({ iceServers: [STUN, coturn] });
    }

    console.warn('[ice-servers] coturn unreachable — falling back to Metered');
    const metered = await getMeteredIceServers();
    if (metered) {
      noteIcePool(req, 'metered');
      return NextResponse.json({ iceServers: [STUN, ...metered] });
    }
    noteIcePool(req, 'coturn');
    return NextResponse.json({ iceServers: [STUN, coturn] });
  }

  const metered = await getMeteredIceServers();
  if (metered) {
    noteIcePool(req, 'metered');
    return NextResponse.json({ iceServers: [STUN, ...metered] });
  }
  noteIcePool(req, 'stun_only');
  return NextResponse.json({ iceServers: FALLBACK_ICE_SERVERS });
}
