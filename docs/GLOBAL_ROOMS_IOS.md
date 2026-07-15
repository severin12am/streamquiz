# Global Rooms — Native Client Parity Spec

Product rules, API contracts, UX copy, and behavioral requirements for **public / discoverable lobbies** on WhoSmarter native clients (iOS and any future Android build).

**Audience:** whoever implements native parity against the **deployed web API**.  
**Not in scope here:** platform-specific UI code, navigation wiring, or framework choices.

**Status:** **Web shipped.** Native clients should match web behavior against the same backend.

**Related docs in this repo:**

| File | Role |
|------|------|
| [`docs/GLOBAL_ROOMS.md`](./GLOBAL_ROOMS.md) | Full product + web design (source of truth for rules) |
| [`docs/GLOBAL_ROOMS.md` §14](./GLOBAL_ROOMS.md#14-host-kick-required) | Host kick — server design |
| `ios_implementation_help.md` | iOS repo env, `X-WhoSmarter-Client: ios`, general API base URL |
| `lib/types.ts` | Shared types (`Game`, `CreateGamePayload`, `PublicGameSummary`) |

**Web reference implementation:**

| Area | Files |
|------|--------|
| Create + More panel | `components/CreateGame.tsx` |
| Browse list | `components/PublicGamesBrowser.tsx` |
| Lobby + kick | `components/Lobby.tsx`, `components/GameScreen.tsx` |
| Game state / R1 / removed | `hooks/useGameState.ts` |
| Join + ban | `lib/supabase.ts` (`joinGame`) |
| APIs | `app/api/create-game/route.ts`, `app/api/public-games/route.ts`, `app/api/kick-player/route.ts` |
| Schema | `supabase/migration-v15-global-rooms.sql` |

---

## 1. Product summary

A “global room” is not a separate system. It is a normal `games` row that is **optionally listed** while `status === 'waiting'`.

Native must support:

1. **Create** — optional public lobby via **Invite only** (default **ON** = private).
2. **Browse** — list open public waiting rooms; user picks one to join.
3. **Start quiz** — host start **permanently unlists** the room (`is_public → false`).
4. **Host kick** — host removes guests in lobby and during play; banned clients cannot rejoin that game.

Private link/ID join continues to work for both public and private games.

---

## 2. Product rules (locked)

| Rule | Value |
|------|--------|
| Default privacy | **Invite only ON** → `is_public: false` |
| Public opt-in | Turn Invite only **OFF** before create → `is_public: true` |
| When listed | `is_public === true` **and** `status === 'waiting'` |
| When unlisted forever | Host **Start quiz** sets `is_public = false` (Rule R1) |
| Privacy change after create | **Not allowed** (create-time only; DB trigger allows only true → false) |
| Rematch | Must **not** reappear in Browse (flag already false after first start) |
| Browse auth | **No** sign-in required to browse or join |
| Create auth (iOS) | Existing pattern: `X-WhoSmarter-Client: ios`, no Google JWT |
| Join | Same guest join path as deep link / paste game ID |
| Host kick | **Required** — lobby + in-game; per-game ban by `client_id` |
| Directory query | **Must use** `GET /api/public-games` — never client `select *` on `games` |
| Staleness | Waiting rooms older than **6 hours** are excluded from Browse |
| Full lobbies | Rooms with `player_count >= 6` are excluded from Browse |

---

## 3. UX specification

### 3.1 Home — More panel

Panel toggle labels (EN):

| Open | Close |
|------|-------|
| **More** | **Hide** |

**Panel order** (matches shipped web):

1. Difficulty  
2. Number of questions  
3. Game mode (regular / hardcore)  
4. Multiple choice  
5. Player cameras  
6. **Invite only** (switch, default **ON**)  
7. **Browse open games** (navigates to full browse view — **last** in panel)

Browse is secondary to create; it lives under More, not as the primary home CTA.

**Invite only mapping:**

```
is_public = !inviteOnly   // inviteOnly defaults true
```

### 3.2 Browse — entry + full view

**Entry row (inside More):**

| | EN |
|--|-----|
| Title | Browse open games |
| Hint | Join a quiz that’s waiting for players |

Tap opens a **separate full browse view** (not an inline list inside More). User can return to the create home from browse.

**Browse screen:**

| Element | EN |
|---------|-----|
| Title | Open games |
| Back | Back |
| Refresh | Refresh |
| Loading | Loading… |
| Empty | No open games right now. |
| Error | Could not load open games. |
| Row CTA | Join |

**Row metadata** (shown on each listed game):

| Field | Shown |
|-------|-------|
| Topic | Yes (primary) |
| Player count | Yes — `{n}/{max}` (max is always 6) |
| Difficulty | Yes |
| MC vs voice | Yes |
| Game mode | Yes — regular / hardcore display names |
| Relative created time | Yes — e.g. “Just now”, “3 min ago”, “2 h ago” |
| Question count | **No** (API may include; do not show in v1) |
| Cameras enabled | **No** (API may include; do not show in v1) |

Legacy `game_mode` values (`think`, `classic`) may appear in API data; treat anything other than `hardcore` as regular for display.

### 3.3 Lobby

| Element | When | EN |
|---------|------|-----|
| Public listing hint | Host + `is_public === true` + waiting | Visible in Browse until you start. |
| Remove control | Host only, on guest rows | Remove |
| Remove confirm | Lobby kick | Remove {name} from this game? |
| Remove error | Kick API failure | Couldn’t remove that player. Try again. |

Share link / invite flow remains available for public games (link + browse can coexist).

### 3.4 In-game kick

Host can remove guests **during play** as well as in lobby (same Remove affordance on guest rows).

**Confirm dialog:** web shows confirm in lobby always; in-game kick also confirms before calling the API.

### 3.5 Kicked / banned player

**After kick** (this device had a seat, row deleted, rejoin blocked):

| Element | EN |
|---------|-----|
| Title | You were removed |
| Body | The host removed you from this game. |
| CTA | Back to home |

Stop media/WebRTC; do not auto-reclaim a seat.

**Join attempt while banned** (never had seat, or explicit join fails):

| Copy | EN |
|------|-----|
| Message | You can’t rejoin this game. |

Do not leave the user on an indefinite “Joining…” state.

### 3.6 Join from Browse

After user taps Join on a row:

1. Open the game with `gameId = row.id` as **guest** (not host).
2. Use the **existing** join/seat/lobby flow (same as opening `/game/[id]` on web).
3. Web **auto-claims a seat** on arrival when the lobby is open and a seat exists; native should match that expectation so Browse → Join feels immediate.

Full room: show existing full-lobby copy (`join.full`).

---

## 4. Backend API contracts

Base URL: production web host (iOS: `EXPO_PUBLIC_API_BASE_URL`, no trailing slash), e.g. `https://whosmarter.netlify.app`.

### 4.1 Create game — `is_public`

`POST {API}/api/create-game`

**Headers (iOS):**

```http
Content-Type: application/json
X-WhoSmarter-Client: ios
```

Optional (quota builds): `X-Quota-Key: …` as today.

**Body** — extend existing create payload:

```json
{
  "topic": "90s Cartoons",
  "difficulty": "medium",
  "num_questions": 5,
  "mc_mode": true,
  "game_mode": "regular",
  "cameras_enabled": true,
  "locale": "en",
  "is_public": false
}
```

| Field | Type | Default if omitted | Notes |
|-------|------|--------------------|--------|
| `is_public` | boolean | **`false`** | Send `true` only when Invite only is off |

**Response:** unchanged — `{ gameId, questions, provider?, quota? }`.

**Back-compat:** Clients that omit `is_public` create **private** games.

### 4.2 List open games

`GET {API}/api/public-games`

**Headers:** none required. Optional: `X-WhoSmarter-Client: ios` for metrics.

**Response 200:**

```json
{
  "games": [
    {
      "id": "uuid",
      "topic": "90s Cartoons",
      "difficulty": "medium",
      "num_questions": 5,
      "mc_mode": true,
      "game_mode": "regular",
      "created_at": "2026-07-11T12:00:00.000Z",
      "player_count": 2,
      "max_players": 6
    }
  ]
}
```

Envelope is always `{ games: PublicGameSummary[] }` (never a bare array).

**Server filters (client should not reimplement listing logic):**

- `is_public = true` and `status = 'waiting'`
- `created_at` within last **6 hours**
- `player_count < max_players` (full rooms omitted)
- Ordered newest first; capped at **30** rows
- **Never** includes `questions`, answers, or `host_user_id`

**Errors:**

| Status | Body | User-facing |
|--------|------|-------------|
| 429 | `{ error: "Too many requests" }` | Slow down / try again |
| 500 | `{ error: "Failed to list open games" }` | Error + retry |
| Network | — | Offline / retry |

Rate-limit response may include standard rate-limit headers from web.

Refresh browse on screen open and on user refresh; optional polling while browse is visible is fine (web loads on mount only).

### 4.3 Start quiz — Rule R1

When the host starts from lobby, the game update **must** include:

```json
{
  "status": "playing",
  "is_public": false
}
```

plus existing start fields (`current_question_index`, phase reset, etc. — match web `useGameState` → `startGame`).

If start sets `status` but leaves `is_public: true`, a later rematch that returns to `waiting` could incorrectly re-list the room.

DB trigger `games_lock_setup_columns` only allows `is_public` to change **true → false** (never re-list).

### 4.4 Join

No new join API. Seat claim uses existing Supabase `players` insert path.

**Ban enforcement:** `game_bans` + `players_reject_banned` trigger raises `banned_from_game` on insert. Client should map that to `join.banned` / removed UX.

**Reconnect:** same `client_id` with an existing `players` row re-attaches (rename allowed).

### 4.5 Kick player

`POST {API}/api/kick-player`

**Headers (iOS):**

```http
Content-Type: application/json
X-WhoSmarter-Client: ios
```

Web may also send `Authorization: Bearer <supabase access token>` when the host signed in with Google; iOS uses **`hostClientId`** only.

**Body:**

```json
{
  "gameId": "uuid",
  "targetPlayerId": "uuid",
  "hostClientId": "stable-device-client-id"
}
```

| Field | Required | Notes |
|-------|----------|--------|
| `gameId` | yes | Current game |
| `targetPlayerId` | yes | `players.id` of the **guest** |
| `hostClientId` | yes on iOS | Must match host’s `players.client_id` for this game |

**Success:** `{ "ok": true }`

**Server effects:** upsert `game_bans (game_id, client_id)` → delete guest `players` row.

**Errors:**

| Status | When |
|--------|------|
| 400 | Invalid ids; `hostClientId` missing/too long; target is host |
| 403 | Caller not host |
| 404 | Game or player not found |
| 429 | Rate limited |
| 500 | DB failure |

**Rules:**

- Only host may call.
- Never target host’s own `players.id`.
- Kick must go through this API — not client-side `players` delete (RLS denies anon delete).

**Removed detection (web behavior to match):** if this client previously held a seat and the row disappears, attempt one rejoin; if ban blocks insert → show removed screen.

---

## 5. Types

Keep aligned with web `lib/types.ts` and `app/api/public-games/route.ts`:

```ts
interface Game {
  // ...existing fields
  is_public?: boolean;
}

interface CreateGamePayload {
  // ...existing fields
  is_public?: boolean;
}

interface PublicGameSummary {
  id: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  num_questions: number;
  mc_mode: boolean;
  game_mode: 'regular' | 'hardcore' | 'think' | 'classic';
  created_at: string;
  player_count: number;
  max_players: number; // always 6 (MAX_PLAYERS)
}
```

---

## 6. i18n keys (align with web)

Reuse the same keys across locales (`lib/i18n/messages.ts` + `lib/i18n/locales/*`):

| Purpose | Key |
|---------|-----|
| Open More | `create.adjustShow` |
| Close More | `create.adjustHide` |
| Browse entry title | `create.browseOpenGames` |
| Browse entry hint | `create.browseOpenGamesHint` |
| Invite only title | `create.inviteOnlyTitle` |
| Invite only hint ON | `create.inviteOnlyHintOn` |
| Invite only hint OFF | `create.inviteOnlyHintOff` |
| Browse title | `rooms.title` |
| Browse empty | `rooms.empty` |
| Browse refresh | `rooms.refresh` |
| Browse back | `rooms.back` |
| Browse loading | `rooms.loading` |
| Browse error | `rooms.error` |
| Join | `rooms.join` |
| Row players | `rooms.players` |
| Relative time | `rooms.agoJustNow`, `rooms.agoMinutes`, `rooms.agoHours` |
| Row MC/voice | `rooms.mc`, `rooms.voice` |
| Row mode | `rooms.modeRegular`, `rooms.modeHardcore` |
| Lobby public badge | `lobby.listedPublicly` |
| Remove | `lobby.removePlayer` |
| Remove confirm | `lobby.removeConfirm` |
| Remove error | `lobby.removeError` |
| Join banned | `join.banned` |
| Removed title | `game.removedTitle` |
| Removed body | `game.removedBody` |
| Removed CTA | `game.removedHome` |
| Full lobby | `join.full` |

---

## 7. Security constraints

- **Never** list rooms via client `supabase.from('games').select('*').eq('is_public', true)` — over-fetches `questions` and private metadata.
- Create stays on `POST /api/create-game` (not direct insert).
- Do not log full game rows with answers.
- Kick + ban writes are service-role only (`game_bans` has no anon RLS policies).

---

## 8. QA matrix

| # | Steps | Expected |
|---|--------|----------|
| 1 | Create with Invite only ON | Not in Browse |
| 2 | Create with Invite only OFF | Appears in Browse after refresh |
| 3 | Second client Join from list | Guest in lobby with host |
| 4 | Host Start | Room gone from Browse |
| 5 | Rematch | Still not listed |
| 6 | Private link join | Works without Browse |
| 7 | Full lobby (6) | Not in list / join shows full |
| 8 | Room older than 6 h | Not in list |
| 9 | Offline / API error on Browse | Error + retry |
| 10 | Burst refresh | 429 handled gracefully |
| 11 | Host kicks guest in lobby | Guest removed; seat free; confirm shown |
| 12 | Kicked guest reopens same game | Cannot rejoin; banned/removed copy |
| 13 | Host kicks mid-game | Roster updates; game continues |
| 14 | Guest calls kick API | 403; no effect |
| 15 | Web host + iOS guest (and reverse) | Kick and browse behave consistently |

---

## 9. Out of scope (v1)

- Topic search / filters  
- Mid-lobby privacy toggle  
- In-progress games in Browse  
- Global account bans / report pipeline  
- Showing question count or cameras on browse rows  

---

## 10. Deployment note

Native builds need `EXPO_PUBLIC_API_BASE_URL` (or equivalent) pointing at a host where migration v15+ is applied and these routes are live:

- `POST /api/create-game` with `is_public`
- `GET /api/public-games`
- `POST /api/kick-player`
- Host start writes `is_public: false`

If Browse is exposed before the API exists, list calls will fail — gate the entry behind version/config if needed.

---

*End of native global rooms parity spec.*
