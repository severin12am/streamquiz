// ============================================================
// API Route: GET /api/ice-servers
//
// Returns the list of ICE servers (STUN + TURN) the browser uses
// to connect the two cameras. Computed on the server so TURN
// credentials are NOT baked into the client JavaScript bundle.
//
// WHY THIS MATTERS:
//   STUN alone fails on ~10-20% of networks (VPNs, strict NAT,
//   and notably ISPs that block peer-to-peer — common in Russia).
//   A TURN server RELAYS the video and makes it work everywhere.
//
// ---- HOW TO ADD A FREE TURN SERVER (pick ONE) ----
//
// OPTION A — Metered (recommended: 20 GB/month free, global,
//            routes over TLS:443 which bypasses most blocking):
//   1. Sign up free at https://www.metered.ca/
//   2. In their dashboard, note your app subdomain (e.g.
//      "myapp.metered.live") and your API key.
//   3. In Netlify → Site configuration → Environment variables, add:
//        METERED_DOMAIN   = myapp.metered.live
//        METERED_API_KEY  = <your api key>
//   4. Redeploy.
//
// OPTION B — ExpressTURN or any provider giving STATIC creds
//            (1 TB/month free at https://www.expressturn.com/):
//   1. Sign up, copy the TURN URL(s), username, and password.
//   2. In Netlify env vars, add:
//        TURN_URLS        = turn:relay1.expressturn.com:3478,turns:relay1.expressturn.com:443
//        TURN_USERNAME    = <username>
//        TURN_CREDENTIAL  = <password>
//   3. Redeploy.
//
// If NEITHER is configured, we fall back to public STUN + a free
// public TURN relay (works on some networks, not all).
// ============================================================

import { NextResponse } from 'next/server';

// Public fallback — used when no TURN provider is configured.
const FALLBACK_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'turn:freeturn.net:3478',  username: 'free', credential: 'free' },
  { urls: 'turns:freeturn.net:5349', username: 'free', credential: 'free' },
];

export async function GET() {
  // ---- OPTION A: Metered dynamic credentials ----
  const meteredKey    = process.env.METERED_API_KEY;
  const meteredDomain = process.env.METERED_DOMAIN; // e.g. "myapp.metered.live"
  if (meteredKey && meteredDomain) {
    try {
      const res = await fetch(
        `https://${meteredDomain}/api/v1/turn/credentials?apiKey=${meteredKey}`,
        { cache: 'no-store' }
      );
      if (res.ok) {
        const iceServers = await res.json();
        if (Array.isArray(iceServers) && iceServers.length > 0) {
          // Prepend Google STUN for good measure
          return NextResponse.json({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, ...iceServers],
          });
        }
      }
      console.error('[ice-servers] Metered returned unexpected response');
    } catch (err) {
      console.error('[ice-servers] Metered fetch failed:', err);
    }
  }

  // ---- OPTION B: Static TURN credentials (ExpressTURN, etc.) ----
  const turnUrls = process.env.TURN_URLS; // comma-separated
  const turnUser = process.env.TURN_USERNAME;
  const turnCred = process.env.TURN_CREDENTIAL;
  if (turnUrls && turnUser && turnCred) {
    return NextResponse.json({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        {
          urls: turnUrls.split(',').map((u) => u.trim()).filter(Boolean),
          username: turnUser,
          credential: turnCred,
        },
      ],
    });
  }

  // ---- Fallback ----
  return NextResponse.json({ iceServers: FALLBACK_ICE_SERVERS });
}
