# WhoSmarter — Privacy-Safe Product Analytics

Design for **operational metrics** you need (quiz usage, platforms, video path, rough bandwidth) **without** collecting personal data that creates heavy privacy/legal burden.

**Status:** Implemented (web). View data in **Supabase → SQL Editor** (no in-app dashboard).  
**Ship checklist:** run `supabase/migration-v14-telemetry.sql` once on your Supabase project (creates table only — no data deletes).  
**Related:** `telemetry_events` table, `POST /api/telemetry`, `game_created` in create-game, host `game_finished` + `webrtc_summary` on end, sampled `ice_config_served`.

| Hand-off file | Use |
|---------------|-----|
| [`docs/TELEMETRY_VISUALIZE.md`](./TELEMETRY_VISUALIZE.md) | Paste into an AI with SQL results to chart/summarize |
| [`docs/TELEMETRY_IOS.md`](./TELEMETRY_IOS.md) | Give to the iOS/RN project for client telemetry parity |

**Not legal advice.** This is an engineering posture that *reduces* risk. If you operate in the EU/UK or grow significantly, still skim GDPR/CCPA basics or ask a lawyer once — especially if you later add ads, sell data, or identify users across sessions.

---

## 1. Goals

Answer questions like:

| Question | Example answer |
|----------|----------------|
| How many quizzes were created / finished? | 120 created, 85 reached `ended` this week |
| How many players per game? | avg 2.4, histogram 2/3/4/5/6 |
| Language / difficulty / question count / mode | EN 60%, medium 70%, 5Q default, regular vs hardcore |
| Web vs iOS | creates: 70% web / 30% iOS; joins if reported |
| Did video use P2P or TURN? | 82% pairs direct (host/srflx), 18% relay |
| Which relay? | coturn vs Metered fallback (when known) |
| Rough media traffic | ~sum of reported bytes per game (order-of-magnitude) |

---

## 2. Non-goals (legal / product)

**Do not collect** (v1 and preferably ever for this table):

| Avoid | Why |
|-------|-----|
| Email, name, Google `sub`, `host_user_id` | Account identifiers → personal data |
| IP address, precise geo, city | Classic PII / tracking identifiers |
| Full `client_id` / device ID long-term | Cross-session tracking ID |
| Raw ICE candidate strings | Often embed **IP addresses** |
| Display names, chat, spoken transcripts | User content / sensitive |
| Full quiz **topic** free text | Can be personal (“My divorce”, school names); also not needed for ops |
| Exact GPS, contacts, photos | Irrelevant and high risk |
| Advertising IDs, third-party trackers (FB Pixel, etc.) | Cookie/consent banners, DPAs |
| Selling or sharing analytics with data brokers | Don’t |

**Prefer** first-party, **aggregate-friendly**, **server-owned** rows with **no way to contact a person** from the analytics row alone.

### 2.1 Framing that keeps this light

Treat this as **anonymous product telemetry / server logs for app health**, not a “user profiles” system:

- No “user” table in analytics.  
- No marketing emails derived from it.  
- Short retention (e.g. **90 days** raw events, then delete or roll up to monthly aggregates).  
- Access limited to you (service role / admin SQL only; **no public SELECT**).

Under GDPR, even “anonymous” processing can be personal data if re-identifiable. Design so rows **cannot** reasonably re-identify someone: no stable IDs, no IPs, no topics, coarse time.

You already store `host_user_id` on `games` for auth — that’s separate. **Do not copy it into analytics.**

---

## 3. What “video path” means (vocabulary)

Media is **not** “uploaded to your Next.js server.” It is a **WebRTC mesh** (every player sends media to every other player).

| Path | ICE candidate types | Meaning | Whose bandwidth |
|------|---------------------|---------|-----------------|
| **Direct P2P** | `host`, `srflx`, `prflx` (not `relay`) | Peers talk peer-to-peer (LAN or via STUN hole-punch) | Players’ ISPs only |
| **TURN relay** | `relay` on local and/or remote | Media hairpins through a TURN server | **Your coturn VPS** (or Metered if fallback) |

`useMeshWebRTC` already derives `usingTurnRelay` and candidate types via `pc.getStats()` when debug logging is on — analytics should **persist a sanitized summary**, never raw candidates.

**Relay provider label** (server-side, when ICE config is issued):

| Label | When |
|-------|------|
| `none` / N/A | Cameras off or no peer pairs |
| `p2p` | Selected pair not relay |
| `coturn` | Relay + ice-servers response used your TURN env |
| `metered` | Relay + coturn was down / Metered credentials served |
| `unknown_relay` | Relay detected but client can’t tell which host (don’t send TURN IPs to analytics) |

Clients should report **path class** (`p2p` | `relay` | `failed` | `unknown`), not the TURN IP. Server can tag “which credentials we handed out this session” via a short-lived `ice_session_id` if you want coturn vs Metered attribution without client guessing.

---

## 4. Recommended architecture

```
Web / iOS clients
  │
  │  POST /api/telemetry  (small JSON, rate-limited, no auth required for anon game stats)
  │  — or server writes from create-game / end hooks
  ▼
Next.js API (service role)
  ▼
Postgres table `telemetry_events`  (RLS: deny all anon; service role only)
  ▼
You query in Supabase SQL (or a tiny private admin page later)
```

**Two layers of truth:**

1. **Server-authored events** (best for creates, platform, settings) — written inside `/api/create-game`, optional end-of-game if you add a server path.  
2. **Client-authored events** (needed for WebRTC path + bytes) — only the browser/app sees `getStats()`. Sanitize on client; re-validate/clamp on server.

Do **not** use Google Analytics / Mixpanel / PostHog by default unless you accept their DPAs and cookie banners. First-party table is simpler and more private.

---

## 5. Event model

### 5.1 Table: `telemetry_events`

```sql
-- migration-vN-telemetry.sql
CREATE TABLE IF NOT EXISTS telemetry_events (
  id           BIGSERIAL PRIMARY KEY,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Event kind
  event        TEXT NOT NULL,
  -- e.g. game_created | game_finished | webrtc_summary | ice_config_served

  -- Opaque correlation for ONE game only (NOT the real games.id UUID if you want extra isolation)
  -- Option A: store games.id UUID (simplest; deleted games still leave stats)
  -- Option B: hash(game_id + server_salt) so analytics can't join to live games easily
  game_ref     TEXT,

  -- Dimensions (enums / small ints only)
  platform     TEXT,          -- 'web' | 'ios' | 'unknown'
  locale       TEXT,          -- 'en' | 'ru' | ... UI language, not IP country
  difficulty   TEXT,          -- easy | medium | hard
  game_mode    TEXT,          -- regular | hardcore | ...
  mc_mode      BOOLEAN,
  cameras_on   BOOLEAN,
  num_questions SMALLINT,
  player_count  SMALLINT,     -- at event time (create≈1, finish=final roster size)
  is_public    BOOLEAN,       -- after global rooms ships
  status       TEXT,          -- for finished: ended | abandoned (optional)

  -- WebRTC summary (nullable)
  webrtc_pairs_total     SMALLINT,
  webrtc_pairs_p2p       SMALLINT,
  webrtc_pairs_relay     SMALLINT,
  webrtc_pairs_failed    SMALLINT,
  relay_provider         TEXT,     -- coturn | metered | mixed | unknown | null
  bytes_sent_total       BIGINT,   -- sum across pairs, optional rounded
  bytes_recv_total       BIGINT,
  cameras_enabled_mesh   BOOLEAN,

  -- Free-form but MUST stay non-PII (validate allowlist server-side)
  meta         JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX telemetry_events_created_at_idx ON telemetry_events (created_at DESC);
CREATE INDEX telemetry_events_event_idx ON telemetry_events (event, created_at DESC);

ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;
-- No policies for anon/authenticated → only service role
```

**Retention job** (extend cleanup cron or separate):

```sql
DELETE FROM telemetry_events WHERE created_at < NOW() - INTERVAL '90 days';
```

Optional monthly rollup table later: counts only, keep 2+ years.

### 5.2 Events to emit

#### A. `game_created` (server, in `/api/create-game`)

After successful insert:

| Field | Source |
|-------|--------|
| `platform` | `X-WhoSmarter-Client: ios` → `ios`, else `web` |
| `locale` | body `locale` |
| `difficulty`, `game_mode`, `mc_mode`, `cameras_on`, `num_questions` | validated config |
| `player_count` | `1` (host not seated yet — or omit) |
| `is_public` | when global rooms exists |
| `game_ref` | game id or salted hash |
| **Not stored** | topic, host_user_id, email, IP |

#### B. `game_finished` (client or server)

When `phase/status` → `ended` (or host abandons after N minutes — optional):

| Field | Source |
|-------|--------|
| `player_count` | final `players.length` |
| same setup dims | from game row (already known) or re-sent |
| `status` | `ended` |

Prefer **one client** (host) reporting finish to avoid duplicates, with server upsert keyed by `(event, game_ref)` unique constraint:

```sql
UNIQUE (event, game_ref)  -- for game_created / game_finished only
```

#### C. `webrtc_summary` (each client once near end of mesh, or host-only aggregate)

From `getStats()` **without** candidate IPs:

```ts
// Conceptual payload (client → POST /api/telemetry)
{
  event: 'webrtc_summary',
  game_ref: gameId,           // server may hash
  platform: 'web' | 'ios',
  pairs_total: 3,
  pairs_p2p: 2,
  pairs_relay: 1,
  pairs_failed: 0,
  // Do NOT send candidate IP or full candidate string
  bytes_sent_total: 12_400_000,   // optional: round to 100KB
  bytes_recv_total: 11_900_000,
  cameras_on: true
}
```

**Rounding:** store `Math.round(bytes / 100_000) * 100_000` (100 KB buckets) so values are less fingerprint-y and “good enough” for traffic estimates.

**Who reports:**  
- **Option 1 (simpler):** each peer posts its own summary → you see N rows per game; aggregate in SQL.  
- **Option 2:** only host posts; host’s view of each pair’s selected type (host sees all PCs in mesh). Prefer host-only to cut volume.

#### D. `ice_config_served` (server, optional, in `/api/ice-servers`)

Increment counters only (or sample 10%):

```ts
{ event: 'ice_config_served', relay_pool: 'coturn' | 'metered' | 'stun_only', platform?: from header }
```

No game id required. Answers “how often is coturn healthy vs Metered fallback?”

---

## 6. API: `POST /api/telemetry`

| Rule | Detail |
|------|--------|
| Body size | Max ~4 KB |
| Rate limit | Per IP bucket **but do not store IP in DB** (use existing in-memory `rate-limit.ts` only) |
| Allowlist | `event` enum; strip unknown JSON keys |
| Clamp | `player_count` 1–6, `num_questions` 3–20, bytes ≥ 0, locale length ≤ 8 |
| Auth | Not required for game telemetry (guests are anonymous). Optional: require `game_ref` to look like UUID |
| Response | `{ ok: true }` always on success (no echo of PII) |

**Reject** if body contains forbidden keys: `email`, `name`, `ip`, `candidate`, `sdp`, `token`, `client_id`, `host_user_id`, etc.

---

## 7. Client instrumentation map

| Place | Work |
|-------|------|
| `app/api/create-game/route.ts` | Insert `game_created` |
| `app/api/ice-servers/route.ts` | Optional `ice_config_served` counter |
| `hooks/useMeshWebRTC.ts` | On mesh teardown or game end: compute pair path + bytes (reuse existing getStats logic); call telemetry API **with WEBRTC_DEBUG off** (production path) |
| `hooks/useGameState.ts` / `GameScreen` | On transition to `ended`, host sends `game_finished` + triggers webrtc summary |
| iOS RN | Same POST body + `platform: 'ios'` / header `X-WhoSmarter-Client: ios` |

### 7.1 Extracting path without leaking IPs

```ts
// Safe fields only
type PairSummary = {
  path: 'p2p' | 'relay' | 'failed' | 'unknown';
  // NEVER: localAddress, remoteAddress, candidate, url with IP
};

function pathFromStats(localType?: string, remoteType?: string, iceState?: string): PairSummary['path'] {
  if (iceState === 'failed' || iceState === 'disconnected') return 'failed';
  if (localType === 'relay' || remoteType === 'relay') return 'relay';
  if (localType && remoteType && localType !== '?' && remoteType !== '?') return 'p2p';
  return 'unknown';
}
```

---

## 8. Example SQL (your dashboard)

```sql
-- Quizzes created per day, web vs iOS
SELECT date_trunc('day', created_at) AS day,
       platform,
       COUNT(*) 
FROM telemetry_events
WHERE event = 'game_created'
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY 1, 2
ORDER BY 1 DESC;

-- Difficulty / locale mix
SELECT locale, difficulty, COUNT(*)
FROM telemetry_events
WHERE event = 'game_created'
GROUP BY 1, 2;

-- Average players at finish
SELECT AVG(player_count), COUNT(*)
FROM telemetry_events
WHERE event = 'game_finished';

-- P2P vs TURN share
SELECT
  SUM(webrtc_pairs_p2p)   AS p2p_pairs,
  SUM(webrtc_pairs_relay) AS relay_pairs,
  SUM(webrtc_pairs_failed) AS failed_pairs
FROM telemetry_events
WHERE event = 'webrtc_summary'
  AND created_at > NOW() - INTERVAL '30 days';

-- Rough relay traffic (bytes are incomplete if only one reporter)
SELECT
  date_trunc('week', created_at) AS week,
  SUM(bytes_sent_total + bytes_recv_total) AS approx_bytes
FROM telemetry_events
WHERE event = 'webrtc_summary'
GROUP BY 1;
```

---

## 9. Traffic / coturn notes (honest limits)

| Source | What it tells you | Gap |
|--------|-------------------|-----|
| Client `getStats` bytes | Order-of-magnitude media volume per peer view | Not billing-grade; double-count if every peer reports both directions |
| coturn server logs / Prometheus | Real relay GB on **your** VPS | Needs VPS setup; best for “am I out of bandwidth?” |
| Metered dashboard | When fallback is used | Only Metered share |
| Next.js / Netlify logs | API hits, not media | Media never hits Netlify |

**Recommendation:**  
- Product DB: pair counts (p2p vs relay) + rounded bytes.  
- Ops: enable coturn Prometheus or weekly `vnstat` on the VPS for real relay traffic cost.

---

## 10. Privacy checklist (ship gate)

- [ ] No names, emails, IPs, topics, transcripts in `telemetry_events`  
- [ ] No raw ICE/SDP  
- [ ] No third-party ad pixels  
- [ ] RLS denies public read  
- [ ] 90-day retention job  
- [ ] Rate limit on POST  
- [ ] Allowlist fields server-side  
- [ ] Bytes rounded  
- [ ] Docs mention telemetry in a short privacy note on the site (one sentence is enough: “We store anonymous game settings and connection quality stats to run the service, not profiles or ads.”) — good practice even for light analytics  

### 10.1 Optional privacy note (site footer)

> Anonymous technical stats (language, difficulty, player count, whether video used a relay) help us run WhoSmarter. We don’t sell this data or build advertising profiles.

Not a full Privacy Policy, but sets expectations. Add a real Privacy Policy if you process Google sign-in (you already do for hosts) — that document should cover **auth** separately from **telemetry**.

---

## 11. Implementation checklist

### Done (web)

- [x] `migration-v14-telemetry.sql` + schema.sql update  
- [x] `POST /api/telemetry` allowlist + rate limit + service role insert  
- [x] Retention 90d inside `cleanup_old_games()`  
- [x] `game_created` from create-game (platform header)  
- [x] Sampled `ice_config_served` (always on Metered fallback)  
- [x] `collectMeshTelemetry` in `useMeshWebRTC`  
- [x] Host `game_finished` + `webrtc_summary` on end  

### Still open

- [ ] Run migration on production Supabase  
- [ ] iOS client parity (same POST + platform `ios`)  
- [ ] Optional private `/admin/stats` (not planned — use Supabase SQL + AI viz)  

---

## 12. What you get vs what you skip

| You asked for | Privacy-safe approach |
|---------------|------------------------|
| How many quizzes | `game_created` / `game_finished` counts |
| Language | `locale` enum |
| Questions / difficulty / mode / MC / cameras | columns on create event |
| How many players | `player_count` on finish |
| Web vs iOS | `platform` from header / field |
| Private mesh vs TURN | `webrtc_pairs_p2p` vs `*_relay` |
| coturn vs Metered | `ice_config_served.relay_pool` + optional relay_provider when known |
| Traffic | rounded bytes + VPS metrics for truth |
| “How many people” | **games-sessions and player seats**, not identified humans (same person two nights = two seats) |

---

## 13. Decisions (defaults)

| Topic | Default |
|-------|---------|
| Store real `games.id` in analytics? | **Yes for simplicity** (`game_ref = id`); games rows still get deleted by cron; analytics remain |
| Topic text | **Never** |
| Third-party analytics SaaS | **No** in v1 |
| Retention | **90 days** raw |
| Who sends WebRTC summary | **Host only** once at end |
| IP in DB | **Never** (rate-limit memory only) |

---

## 14. iOS notes

- Send same `POST /api/telemetry` with `platform: 'ios'` and `X-WhoSmarter-Client: ios`.  
- WebRTC stats APIs differ slightly (`react-native-webrtc`); map to same `p2p` / `relay` / bytes fields.  
- Never put RevenueCat user id or quota key into telemetry.

---

*End of analytics design. Implement after product OK on §13 defaults.*
