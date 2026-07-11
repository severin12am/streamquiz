# Global Rooms — iOS / React Native Implementation Instructions

Self-contained guide for adding **public / discoverable lobbies** to the WhoSmarter **React Native iOS** app.

**Give this file (plus the API contracts below) to the agent or developer working in the iOS repo.**  
Web product rules and DB design live in [`docs/GLOBAL_ROOMS.md`](./GLOBAL_ROOMS.md). This document is the **native parity** checklist: screens, payloads, headers, and edge cases for RN.

**Status:** Spec only — web ships first; implement iOS after (or against) the deployed web API that supports `is_public` and `GET /api/public-games`.

**Related general iOS guides in this monorepo:**

| File | Role |
|------|------|
| `ios_implementation_help.md` | Overall RN architecture, env, create-game headers, parity map |
| `docs/GAME_MODES_REGULAR_HARDCORE.md` | Mode semantics |
| `docs/GLOBAL_ROOMS.md` | Full product + web implementation (source of truth for rules) |

---

## 1. What you are building (native)

Same product as web:

1. **Create:** optional public lobby via an **Invite only** switch (default **ON** = private).
2. **Browse:** list of open public waiting rooms; join one.
3. **Start quiz:** host start **permanently unlists** the room (`is_public → false`).

iOS does **not** invent a separate room system. A “room” is still a Supabase `games` row + existing join/lobby/`GameScreen` flow.

---

## 2. Product rules (locked — do not re-litigate)

| Rule | Value |
|------|--------|
| Default privacy | **Invite only ON** → `is_public: false` |
| Public opt-in | Turn Invite only **OFF** before create |
| When listed | `is_public === true` **and** `status === 'waiting'` |
| When unlisted forever | Host **Start quiz** sets `is_public = false` (and status leaves waiting) |
| Privacy change after create | **Not allowed** (create-time only) |
| Rematch | Must **not** reappear in Browse (flag already false after start) |
| Browse auth | **No** Google sign-in required to browse or join |
| Create auth (iOS) | Existing: `X-WhoSmarter-Client: ios`, no Google JWT (see `ios_implementation_help.md`) |
| Join | Existing guest join path with `gameId` (same as deep link / paste ID) |
| **Host kick** | **Required** — host removes guests (lobby + in-game); per-game ban by `client_id` (§3.5 / §6.8) |

---

## 3. Backend contract (deployed web host)

Base URL: `EXPO_PUBLIC_API_BASE_URL` (no trailing slash), e.g. `https://whosmarter.netlify.app`.

### 3.1 Create game — add `is_public`

`POST {API}/api/create-game`

**Headers (iOS):**

```http
Content-Type: application/json
X-WhoSmarter-Client: ios
```

Optional (quota builds): `X-Quota-Key: …` as today.

**Body (extend existing payload):**

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
| `is_public` | boolean | **`false`** | Must omit or send `false` for invite-only. Send `true` only when Invite only is off. |

**UI mapping:**

```ts
const is_public = !inviteOnly; // inviteOnly defaults to true
```

**Response:** unchanged shape `{ gameId, questions, provider?, quota? }`. Navigate host into lobby / `GameScreen` with that `gameId` as today.

**Back-compat:** Old app builds that never send `is_public` stay **private**. Safe to ship API before the App Store build.

### 3.2 List open games

`GET {API}/api/public-games`

**Headers:** none required (anonymous). Optional: same client header for metrics if you want:

```http
X-WhoSmarter-Client: ios
```

**Response 200 (conceptual):**

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

Exact envelope may be a bare array or `{ games: [...] }` — **match the deployed web route** when implemented; prefer `{ games: PublicGameSummary[] }` for extensibility.

**Do not expect** `questions` or correct answers in this payload. If present, **do not render or cache** them.

**Errors:**

| Status | Meaning | UI |
|--------|---------|-----|
| 429 | Rate limited | “Too many requests. Try again in a moment.” |
| 5xx | Server error | Retry + error state |
| Network | Offline / DNS | Offline message |

**Client rules:**

- Call on Browse screen focus + pull-to-refresh.
- Optional poll every 15–30s while Browse is focused (not in background).
- Sort: trust server order (newest first).
- Hide or disable Join if `player_count >= max_players` (server should already filter).

### 3.3 Start quiz unlists (Rule R1)

Web client (or agreed server path) sets:

```ts
// When host starts — conceptual
{ status: 'playing', is_public: false, /* existing start fields */ }
```

**iOS host start** must do the **same** update the web host does (port from web `useGameState` start handler once web lands R1).

If iOS only sets `status` and leaves `is_public: true`, rematch that returns to `waiting` could re-list the room — **bug**. Always clear `is_public` on start if the column is still true.

**If `is_public` is locked by a DB trigger** after create: web will document the allowed transition (true→false on start) or a service-role endpoint. Follow whatever web shipped; do not invent a second path.

### 3.4 Join

No new API. After user taps Join on a row:

1. Navigate to `GameScreen` with `gameId = row.id`, role = guest/player (not host).
2. Existing seat claim / name / lobby / full-room handling.

Deep links and paste-ID join remain valid for both public and private games.

If join fails because of a **kick ban**, show: *You can’t rejoin this game.* (do not leave the user spinning on “Joining…”).

### 3.5 Kick player (required)

`POST {API}/api/kick-player`

**Headers (iOS):**

```http
Content-Type: application/json
X-WhoSmarter-Client: ios
```

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
| `targetPlayerId` | yes | `players.id` of the **guest** to remove |
| `hostClientId` | yes on iOS | Must match the host’s `players.client_id` for this game (server verifies `role === 'host'`) |

Web may also send `Authorization: Bearer …` matching `host_user_id`; iOS relies on **`hostClientId`** path (same pattern as other host-proven client actions).

**Success:** `{ "ok": true }`  
**Effects (server):** deletes guest `players` row + inserts `(game_id, client_id)` into `game_bans` so that browser cannot rejoin **this** game.

**Errors to handle:**

| Status | UI |
|--------|-----|
| 400 | Target invalid / cannot kick host |
| 403 | Caller not host |
| 404 | Game or player gone |
| 429 | Slow down |
| Network | Retry toast |

**Rules:**

- Only call when `me.role === 'host'`.
- Never send host’s own `players.id` as target.
- Available in **lobby** and **during play**.
- After kick, roster updates via existing Supabase Realtime on `players` (DELETE).

Full web design: `docs/GLOBAL_ROOMS.md` §14.

---

## 4. Types (keep in sync with web `lib/types.ts`)

```ts
// Extend Game
interface Game {
  // ...existing fields
  /** Discoverable in Browse while waiting. Default false. */
  is_public?: boolean;
}

// Extend create payload
interface CreateGamePayload {
  // ...existing fields
  is_public?: boolean;
}

// List row
interface PublicGameSummary {
  id: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  num_questions: number;
  mc_mode: boolean;
  game_mode: 'regular' | 'hardcore' | 'think' | 'classic';
  created_at: string;
  player_count: number;
  max_players: number;
}
```

Copy from web after web PR merges so field names never drift.

---

## 5. Navigation & screens

Mirror web’s home split:

| Web | RN |
|-----|-----|
| Home `homeView: 'create'` | `HomeScreen` (create form) |
| Home `homeView: 'browse'` | `BrowseGamesScreen` (or modal stack screen) |
| `/game/[id]` guest | `GameScreen` role player |
| `/game/[id]?role=host` | `GameScreen` role host |

### Suggested navigator change

```
RootStack
  HomeScreen          // create + More
  BrowseGamesScreen   // full list (push from Home More)
  GameScreen
  ...
```

**Entry:** first control inside **More** (renamed from Adjust) → `navigation.navigate('BrowseGames')`.  
**Back:** stack back to Home create form.

Do **not** put the list as the default tab on launch. Keep create as the primary home, Browse secondary under More — same subtlety as web.

---

## 6. UI specification (iOS)

### 6.1 Rename settings chrome

| Was (if you matched web EN) | New EN |
|-----------------------------|--------|
| Adjust | **More** |
| Hide settings | **Hide** |

Localize all app languages you ship.

### 6.2 More panel order

```
[ More ]
  1. Browse open games     → push BrowseGamesScreen
  2. Difficulty
  3. Number of questions
  4. Game mode
  5. Multiple choice
  6. Cameras
  7. Invite only (Switch, default ON)
```

### 6.3 Invite only switch

| | EN |
|--|-----|
| Title | Invite only |
| Hint when ON | Only people with your link can join. Not shown in the public list. |
| Hint when OFF | Listed under Browse open games until you start the quiz. |
| Default | **ON** |

Use `Switch` (or your existing toggle). Accessibility: state labels “Invite only, on/off”.

Persist only in form state until create (no need to remember last choice across sessions unless you already do for other toggles).

### 6.4 Browse open games — entry row

| | EN |
|--|-----|
| Title | Browse open games |
| Hint | Join a quiz that’s waiting for players |

Chevron affordance; full-width pressable.

### 6.5 BrowseGamesScreen

| Element | Spec |
|---------|------|
| Title | Open games |
| Refresh | Pull-to-refresh + optional header button “Refresh” |
| Empty | “No open games right now.” |
| Error | Message + Retry |
| Loading | Activity indicator first load |
| Row primary | **Topic** |
| Row secondary | Difficulty · MC/Voice · Mode · `{n}/{max}` · relative time |
| Row CTA | **Join** (or whole row tappable) |

**Row fields (locked — match web):**

- Topic  
- Player count (`2/6`)  
- Difficulty  
- MC vs voice **and** game mode (regular / hardcore; use your existing display names)  
- Relative created time (“3 min ago” — use a small relative-time helper; respect locale)

**Not required on row:** question count, cameras (ignore even if API returns them).

### 6.6 Optional lobby badge (host)

If `game.is_public === true` and `status === 'waiting'`:

> Visible in Browse until you start.

Guests: no badge required.

### 6.7 Share link still works

Public games still get a share URL / QR if you already show them. Private games: share only (no Browse). Do not remove link share when public — both channels can work.

### 6.8 Host kick UI (required)

**Lobby player rows** (host only, guest rows only):

- Trailing **Remove** control (destructive secondary / system destructive style is fine; keep it compact).
- Optional `Alert` confirm: “Remove {name} from this game?”
- On confirm → `kickPlayer({ gameId, targetPlayerId, hostClientId })`.
- Disable control while request in flight.

**In-game** (host only):

- Same Remove on the player strip / player menu so a bad actor can be removed mid-quiz.
- Minimum: lobby is not enough for public rooms — implement in-game too.

**Kicked player screen:**

When this device loses its seat and cannot rejoin (banned):

| Element | EN |
|---------|-----|
| Title | You were removed |
| Body | The host removed you from this game. |
| CTA | Back to home |

Stop camera/mic/WebRTC; navigate home on CTA. Do not auto-navigate into a new seat.

**Join banned copy:** You can’t rejoin this game.

---

## 7. API helper sketch

```ts
// src/api/publicGames.ts
import { api } from './base'; // `${EXPO_PUBLIC_API_BASE_URL}${path}`

export type PublicGameSummary = {
  id: string;
  topic: string;
  difficulty: string;
  num_questions: number;
  mc_mode: boolean;
  game_mode: string;
  created_at: string;
  player_count: number;
  max_players: number;
};

export async function fetchPublicGames(): Promise<PublicGameSummary[]> {
  const res = await fetch(api('/api/public-games'), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'X-WhoSmarter-Client': 'ios',
    },
    cache: 'no-store',
  });
  if (res.status === 429) throw new Error('RATE_LIMIT');
  if (!res.ok) throw new Error('FETCH_FAILED');
  const data = await res.json();
  // Support both envelopes until web locks one:
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.games)) return data.games;
  return [];
}
```

Create payload addition:

```ts
// when building body for POST /api/create-game
is_public: !inviteOnly,
```

Kick helper:

```ts
// src/api/kickPlayer.ts
export async function kickPlayer(args: {
  gameId: string;
  targetPlayerId: string;
  hostClientId: string;
}): Promise<void> {
  const res = await fetch(api('/api/kick-player'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-WhoSmarter-Client': 'ios',
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? 'KICK_FAILED');
  }
}
```

---

## 8. Start-quiz patch (critical)

In the host **Start quiz** action (wherever you currently update the game row to leave lobby):

1. Diff against web after GLOBAL_ROOMS web PR — copy the exact fields web writes.
2. Ensure `is_public: false` is included whenever start runs.
3. Test: create public → appear in Browse on another device → host starts → pull-to-refresh Browse → **gone** → rematch → still **gone**.

If start is “any client may advance” in some paths, only the **host start-from-lobby** transition needs R1; phase machines later in a match should not re-set `is_public: true`.

---

## 9. Security notes for mobile

- **Never** list rooms via:

  ```ts
  supabase.from('games').select('*').eq('is_public', true)
  ```

  That can over-fetch `questions` and private metadata depending on RLS. Prefer **`GET /api/public-games`** only.

- Do not log full game rows with answers.
- Create still goes through `/api/create-game` (not direct insert) — unchanged from security hardening.
- Public listing + iOS create without Google relies on existing rate limit + quota; do not weaken headers.

---

## 10. Implementation checklist (iOS)

### Preconditions

- [ ] Web API deployed: `is_public` on create, `GET /api/public-games`, start sets `is_public=false`.
- [ ] Types synced from web `lib/types.ts`.

### Create form

- [ ] Rename Adjust → More, Hide settings → Hide (all locales).
- [ ] Invite only switch default ON; maps to `is_public`.
- [ ] First More row: Browse open games → navigate to browse screen.
- [ ] Old builds without field remain private (server default).

### Browse screen

- [ ] Fetch list on focus + pull-to-refresh.
- [ ] Empty / loading / error / 429 states.
- [ ] Rows show locked metadata fields.
- [ ] Join → GameScreen guest with `id`.
- [ ] Full rooms handled by existing join UI.

### Start / rematch

- [ ] Host start clears `is_public` (R1).
- [ ] Rematch does not re-list.

### Host kick

- [ ] Lobby Remove on guest rows (host only).
- [ ] In-game Remove (host only).
- [ ] `POST /api/kick-player` with `hostClientId`.
- [ ] Realtime roster update for remaining players.
- [ ] Kicked device: removed screen; ban blocks rejoin on same game.
- [ ] Cannot kick host; guests do not see Remove.

### QA matrix

| # | Steps | Expected |
|---|--------|----------|
| 1 | Create with Invite only ON | Not in Browse (web or iOS list) |
| 2 | Create with Invite only OFF | Appears in Browse within refresh |
| 3 | Second device Join from list | Seats as guest; lobby shows host |
| 4 | Host Start | Room disappears from Browse |
| 5 | Rematch | Still not listed |
| 6 | Private link join | Still works without Browse |
| 7 | Full lobby (6) | Not shown or Join shows full |
| 8 | Airplane mode on Browse | Error + retry |
| 9 | Burst refresh | 429 handled gracefully |
| 10 | Host kicks guest in lobby | Guest removed for all; seat free |
| 11 | Kicked guest reloads same game | Cannot rejoin; banned message |
| 12 | Host kicks mid-game | Roster updates; game continues for rest |
| 13 | Guest tries kick API | 403; no effect |

### Out of scope (unless product expands)

- Topic text search  
- Mid-lobby public toggle  
- Showing in-progress games  
- Global account bans / report pipeline  
- Android-specific UX (reuse same screens if you ship Android later)

---

## 11. Copy sheet (EN)

| Key purpose | String |
|-------------|--------|
| Open More | More |
| Close More | Hide |
| Browse entry title | Browse open games |
| Browse entry hint | Join a quiz that’s waiting for players |
| Invite only title | Invite only |
| Invite only hint ON | Only people with your link can join. Not shown in the public list. |
| Invite only hint OFF | Listed under Browse open games until you start the quiz. |
| Browse screen title | Open games |
| Empty | No open games right now. |
| Refresh | Refresh |
| Join | Join |
| Lobby public badge | Visible in Browse until you start. |
| Remove player | Remove |
| Remove confirm | Remove {name} from this game? |
| Kicked title | You were removed |
| Kicked body | The host removed you from this game. |
| Kicked CTA | Back to home |
| Join banned | You can’t rejoin this game. |

Reuse web i18n keys where practical (`create.moreShow`, `rooms.*`, `lobby.removePlayer`, etc.) so EN/RU/other stay aligned.

---

## 12. Coordination with web

| Order | Owner |
|-------|--------|
| 1. Migration `is_public` + `game_bans` + list API + create field + R1 on start + **kick API** | Web repo |
| 2. Web home Browse + Invite only + **host Remove UI** + kicked screen | Web repo |
| 3. Point `EXPO_PUBLIC_API_BASE_URL` at build that has (1) | iOS |
| 4. iOS UI + create payload + Browse + start patch + **kick** | iOS repo |
| 5. Cross-client QA (web host kicks iOS guest and reverse) | Both |

If iOS ships UI before web API: Browse will 404 — feature-flag Browse entry behind a remote config or min API version if needed.

---

## 13. Agent prompt (paste into iOS Cursor session)

```
Implement Global Rooms / public lobbies for WhoSmarter React Native iOS.

READ FIRST:
- docs/GLOBAL_ROOMS_IOS.md (this file’s content — full native spec)
- docs/GLOBAL_ROOMS.md §12 decisions (product rules)
- ios_implementation_help.md for API base URL and X-WhoSmarter-Client: ios on create

Requirements:
1. Create form: rename Adjust→More, Hide settings→Hide.
2. More panel first item: “Browse open games” → full BrowseGamesScreen (not an inline list).
3. Invite only switch default ON; POST /api/create-game with is_public: !inviteOnly.
4. BrowseGamesScreen: GET /api/public-games, pull-to-refresh, rows show topic, n/6, difficulty, MC/voice + mode, relative time; Join → existing GameScreen as guest.
5. Host Start quiz must set is_public: false (match web useGameState after web PR).
6. Do not query games table with select(*) for the directory.
7. No mid-lobby privacy toggle. Anonymous browse/join.
8. Host kick REQUIRED: lobby + in-game Remove for guests; POST /api/kick-player with hostClientId;
   kicked user sees “You were removed”; banned client_id cannot rejoin same gameId.
9. Never client-delete players rows for kick — API only (service role).

Match existing RN patterns, i18n, and navigation. Do not break private link join.
```

---

*End of iOS global rooms instructions.*
