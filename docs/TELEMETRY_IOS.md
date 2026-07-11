# WhoSmarter — iOS / React Native telemetry (hand to iOS project)

**Give this file to the agent or developer working in the iOS/React Native repo.**  
Web already emits these events. iOS should match the same API so Supabase stats include both platforms.

**Related web docs:** `docs/ANALYTICS.md` (design), `docs/TELEMETRY_VISUALIZE.md` (SQL for charts).  
**Base URL:** `EXPO_PUBLIC_API_BASE_URL` (no trailing slash), e.g. `https://your-site.netlify.app`.

---

## 1. Goal

Record **anonymous** product metrics:

- Quizzes created / finished  
- Locale, difficulty, question count, game mode, MC, cameras  
- Player count at end  
- **platform = `ios`**  
- WebRTC path: how many peer pairs used **P2P** vs **TURN relay**, plus rough byte totals  

**Do not send:** names, emails, IP, topic text, transcripts, Google/RevenueCat user ids, quota keys, raw ICE candidates/SDP (they can contain IPs).

---

## 2. Server-side create (already on web API)

When iOS creates a game:

```http
POST {API}/api/create-game
Content-Type: application/json
X-WhoSmarter-Client: ios
```

The **server** writes `game_created` with `platform: ios` automatically.  
You do **not** POST `game_created` from the app (the telemetry route rejects client-side `game_created`).

Include existing body fields (`topic`, `difficulty`, `num_questions`, `mc_mode`, `game_mode`, `cameras_enabled`, `locale`, …). Locale is stored on the telemetry row; **topic is not**.

---

## 3. Client events — `POST /api/telemetry`

```http
POST {API}/api/telemetry
Content-Type: application/json
X-WhoSmarter-Client: ios
```

### 3.1 `game_finished` (host only, once per finished match)

Fire when the match reaches ended (same moment as winner screen), **only if this device is the host**.

```json
{
  "event": "game_finished",
  "game_ref": "<game UUID>",
  "platform": "ios",
  "difficulty": "medium",
  "game_mode": "regular",
  "mc_mode": true,
  "cameras_on": true,
  "num_questions": 5,
  "player_count": 3,
  "status": "ended"
}
```

| Field | Rules |
|-------|--------|
| `game_ref` | Real game UUID (required) |
| `player_count` | 1–6 |
| `num_questions` | 3–20 |
| `status` | `"ended"` (or omit) |

### 3.2 `webrtc_summary` (host only, once per finished match)

After (or with) finish, snapshot WebRTC stats for each peer connection **without** logging candidate IPs.

```json
{
  "event": "webrtc_summary",
  "game_ref": "<game UUID>",
  "platform": "ios",
  "cameras_on": true,
  "cameras_enabled_mesh": true,
  "webrtc_pairs_total": 2,
  "webrtc_pairs_p2p": 1,
  "webrtc_pairs_relay": 1,
  "webrtc_pairs_failed": 0,
  "bytes_sent_total": 12400000,
  "bytes_recv_total": 11800000,
  "player_count": 3
}
```

**How to classify each pair** (from selected ICE candidate types, same idea as web):

| Path | Rule |
|------|------|
| `relay` | local or remote candidate type is `relay` |
| `failed` | ICE/connection failed or disconnected |
| `p2p` | connected and not relay (host / srflx / prflx) |
| unknown | count with failed or omit |

**Bytes:** sum `bytesSent` / `bytesReceived` from RTP stats if available. Server rounds to 100 KB buckets; you may pre-round:

```ts
const round = (n: number) => Math.round(n / 100_000) * 100_000;
```

**Never send:** full candidate strings, local/remote IP addresses, SDP.

### 3.3 Do not send

| Event | Why |
|-------|-----|
| `game_created` | Server-only (403 if client tries) |
| `ice_config_served` | Server-only from `/api/ice-servers` |

---

## 4. Helper sketch

```ts
// src/api/telemetry.ts
const api = (path: string) =>
  `${process.env.EXPO_PUBLIC_API_BASE_URL}${path}`;

export async function sendTelemetry(body: Record<string, unknown>): Promise<void> {
  try {
    const res = await fetch(api('/api/telemetry'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WhoSmarter-Client': 'ios',
      },
      body: JSON.stringify(body),
    });
    // ignore non-OK — stats must never break gameplay
    void res;
  } catch {
    // ignore
  }
}

// On match end (host only):
export function reportMatchEndTelemetry(args: {
  gameId: string;
  difficulty: string;
  gameMode: string;
  mcMode: boolean;
  camerasOn: boolean;
  numQuestions: number;
  playerCount: number;
  mesh: {
    pairsTotal: number;
    pairsP2p: number;
    pairsRelay: number;
    pairsFailed: number;
    bytesSent: number;
    bytesRecv: number;
  };
}) {
  const {
    gameId, difficulty, gameMode, mcMode, camerasOn,
    numQuestions, playerCount, mesh,
  } = args;

  void sendTelemetry({
    event: 'game_finished',
    game_ref: gameId,
    platform: 'ios',
    difficulty,
    game_mode: gameMode,
    mc_mode: mcMode,
    cameras_on: camerasOn,
    num_questions: numQuestions,
    player_count: playerCount,
    status: 'ended',
  });

  void sendTelemetry({
    event: 'webrtc_summary',
    game_ref: gameId,
    platform: 'ios',
    cameras_on: camerasOn,
    cameras_enabled_mesh: camerasOn,
    webrtc_pairs_total: mesh.pairsTotal,
    webrtc_pairs_p2p: mesh.pairsP2p,
    webrtc_pairs_relay: mesh.pairsRelay,
    webrtc_pairs_failed: mesh.pairsFailed,
    bytes_sent_total: mesh.bytesSent,
    bytes_recv_total: mesh.bytesRecv,
    player_count: playerCount,
  });
}
```

Guard with a ref/flag so rematch/end only reports once per ended session (web uses `endTelemetrySentRef`).

---

## 5. ICE fetch header

When calling `GET /api/ice-servers`, send:

```http
X-WhoSmarter-Client: ios
```

So sampled `ice_config_served` rows attribute platform correctly.

---

## 6. Errors / rate limits

| Status | Action |
|--------|--------|
| 200 `{ ok: true }` | Done |
| 400 | Bad payload — fix fields; don’t retry loop |
| 403 | Don’t send `game_created` from client |
| 429 | Back off; drop this sample |
| Network | Ignore |

Telemetry must **never** block join, create, or play.

---

## 7. Checklist

- [ ] Create still uses `X-WhoSmarter-Client: ios` (server `game_created`)  
- [ ] Host sends `game_finished` on end  
- [ ] Host sends `webrtc_summary` with P2P/relay counts (no ICE IPs)  
- [ ] Guests do not send finish/webrtc  
- [ ] No topic / name / client_id / quota key in body  
- [ ] ICE requests send ios client header  
- [ ] Failures are silent  

---

## 8. Agent prompt (paste into iOS Cursor)

```
Add WhoSmarter product telemetry to the React Native iOS app.

READ: docs/TELEMETRY_IOS.md (full contract).

Requirements:
1. Keep POST /api/create-game with X-WhoSmarter-Client: ios (server records game_created).
2. On match end, host only: POST /api/telemetry game_finished + webrtc_summary.
3. WebRTC summary: count pairs as p2p vs relay vs failed from selected ICE types; sum bytes; never send candidate strings or IPs.
4. platform: "ios" on client events; header X-WhoSmarter-Client: ios on telemetry and ice-servers.
5. Fire-and-forget; never break gameplay on failure.
6. Do not send game_created from the client.

Match existing RN patterns and game end / WebRTC code.
```

---

## 9. Verify in Supabase

After an iOS create + full game:

```sql
SELECT event, platform, player_count, webrtc_pairs_p2p, webrtc_pairs_relay, created_at
FROM telemetry_events
WHERE platform = 'ios'
ORDER BY created_at DESC
LIMIT 20;
```

For charts, use `docs/TELEMETRY_VISUALIZE.md`.

---

*End of iOS telemetry instructions.*
