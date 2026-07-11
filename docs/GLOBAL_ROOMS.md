# Global Rooms — Implementation Instructions

Detailed build guide for **public / discoverable lobbies** on WhoSmarter.  
Read this before coding. Match existing patterns in `CreateGame`, `Lobby`, `/api/create-game`, Supabase RLS, and i18n.

**Status:** Spec only — not implemented yet.  
**Decisions locked:** see [§12 Decisions](#12-decisions).  
**iOS / React Native:** web ships first; native parity is specified separately in [`docs/GLOBAL_ROOMS_IOS.md`](./GLOBAL_ROOMS_IOS.md).

**Related code today:**

| Area | Files |
|------|--------|
| Home create form | `components/CreateGame.tsx`, `app/page.tsx` |
| Lobby | `components/Lobby.tsx`, `components/GameScreen.tsx` |
| Create API | `app/api/create-game/route.ts` |
| Types | `lib/types.ts` (`Game`, `CreateGamePayload`, `GameStatus`) |
| Schema / RLS | `supabase/schema.sql`, migrations (esp. v11 RLS, v12 cleanup) |
| i18n | `lib/i18n/messages.ts` + `lib/i18n/locales/*` |
| UI copy map | `docs/ui-home-and-lobby.md` |
| iOS global rooms | `docs/GLOBAL_ROOMS_IOS.md` |
| Host kick | [§14 Host kick](#14-host-kick-required) |

---

## 1. Product goal

Today every game is **invite-by-link only**: the home page creates a private session; guests need `/game/[id]`. There is **no directory** of open games. **There is also no way for the host to remove a player** — that is a required addition for public lobbies (and useful for private ones).

**Goal:** optionally list a host’s waiting lobby so strangers can find and join it from the home screen, until the host starts the quiz. Default experience stays private; public listing is opt-in via a subtle setting (framed as the inverse: “invite only”). Hosts must be able to **kick** disruptive guests and keep them from re-joining that game.

### User stories

1. **Host (private, default)**  
   Creates a quiz as today. Room is **not** in the public list. Only people with the link (or QR) can join.

2. **Host (public)**  
   Turns **Invite only** off under **More**. Creates quiz. While `status === 'waiting'` and `is_public === true`, the room appears in the public browser. When the host taps **Start quiz**, the server/client sets **`is_public = false`** (Rule R1) so the room leaves Browse permanently (including after rematch).

3. **Joiner (browse)**  
   On home, opens **More** → taps the first control **Browse open games** → home swaps to a **separate full browse view** (list of public waiting rooms) → picks one → `/game/[id]` join/lobby flow.

4. **Host (moderation)**  
   In the lobby (and during play), host removes a guest who is disruptive. That person loses their seat, sees a clear “removed” state, and **cannot re-join the same game** with the same browser identity (`client_id`).

---

## 2. UX specification (home)

### 2.1 Rename the collapsible panel

| Current key / EN | New EN (required) | Notes |
|------------------|-------------------|--------|
| `create.adjustShow` → **Adjust** | **More** | Toggle that **opens** the panel |
| `create.adjustHide` → **Hide settings** | **Hide** | Toggle that **closes** the panel |

Update **all** locales (`messages.ts` en/ru + `ar`, `de`, `es`, `fr`, `ja`). Keep i18n keys as `adjustShow` / `adjustHide` **or** rename to `moreShow` / `moreHide` for clarity — prefer renaming keys if you touch every locale anyway.

Internal React state (`showAdjust`, `adjust-panel` CSS class names) may stay for a minimal diff, or be renamed for consistency. Prefer renaming UI-facing strings first; code renames optional.

### 2.2 Panel order (when **More** is open)

**First block (new):** entry that **navigates to the full browse view** (does not expand a list in-panel).

Then existing controls, unchanged in behavior:

1. Difficulty  
2. Number of questions  
3. Game mode (regular / hardcore)  
4. Multiple choice toggle  
5. Player cameras toggle  
6. **New (subtle):** invite-only / privacy toggle (see §2.4)

Visual order:

```
[ More ▾ ]
  1. Browse open games          ← NEW — opens separate full home view
  2. Difficulty …
  3. Questions …
  4. Game mode …
  5. Multiple choice …
  6. Player cameras …
  7. Invite only (ON by default) ← NEW privacy control
```

Putting the privacy toggle **last** keeps it among secondary options. Putting browse **first** matches product intent without making it the primary home CTA.

### 2.3 Browse — entry + full view (decided)

**Entry (inside More):** secondary keycap or full-width row (title + muted hint + chevron). Tap does **not** expand the list in the panel.

**Full view (decided):** a **separate full view on the home page** (`app/page.tsx` / home shell). When active:

- Create form (and optionally the three-step header strip) is **hidden or replaced**.
- User sees title **Open games**, Refresh, and the list.
- **Back** control returns to the normal create home (form + header).
- Same route `/` preferred (client state `homeView: 'create' | 'browse'`) so deep-linking is optional; `?view=browse` is a nice-to-have.

Match keycap / card language (`docs/ui-home-and-lobby.md`, `docs/DESIGN.md`).

| Role | EN (locked proposal) |
|------|----------------------|
| **Button / row title** | **Browse open games** |
| **Subtitle / hint** | Join a quiz that’s waiting for players |
| **Full view title** | Open games |
| **Empty list** | No open games right now. |
| **Refresh** | Refresh |
| **Back** | Back (or chevron back to create) |
| **Row CTA** | Join |

**Each list row shows (locked):**

| Field | Example |
|-------|---------|
| Topic | “90s Cartoons” |
| Player count | `2/6` |
| Difficulty | Medium |
| Answer type + mode | Multiple choice · Every answer counts (or short labels: MC · Regular) |
| Relative created time | “3 min ago” |

**Not required on the row for v1:** question count, cameras on/off (API may still return them for future use).

### 2.4 Privacy control — copy & semantics

**Control type:** same pattern as Multiple choice / Cameras — label + hint left, `role="switch"` toggle right.

| | Proposed EN |
|--|-------------|
| **Title** | **Invite only** |
| **Hint (on)** | Only people with your link can join. Hidden from the public list. |
| **Hint (off)** | Anyone can find this lobby in Browse open games until you start the quiz. |

**Semantics (important):**

| Toggle state | Meaning | `is_public` (DB) | Listed? |
|--------------|---------|------------------|---------|
| **ON** (checked) — **default** | Invite / link only | `false` | No |
| **OFF** | Discoverable while waiting | `true` | Yes, until start |

The user-facing wording is the **restrictive** option (“only allow people with the link…”), so default **ON** preserves today’s private behavior. Do **not** default public.

User’s longer phrasing can be the accessibility label or full hint; keep the title short: **Invite only**.

### 2.5 Create form data flow

Extend local form state + `PendingCreateForm` (OAuth resume) + `CreateGamePayload`:

```ts
// Conceptual — names can match §3
inviteOnly: boolean; // UI; default true
// API body:
is_public: boolean;  // = !inviteOnly
```

On create, POST `/api/create-game` includes `is_public`. Server stores it on the game row.

### 2.6 What the host sees after create

No special path: still redirect to `/game/[id]?role=host` lobby.  
Optional (nice-to-have): small lobby badge “Listed publicly” / “Invite only” for host only — not required for v1.

---

## 3. Data model

### 3.1 New column on `games`

```sql
-- migration-vN-public-rooms.sql (next free version number)
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN games.is_public IS
  'When true, lobby is listable while status = waiting. Default false = invite-only.';
```

**Also:**

1. Add `is_public` to `games_lock_setup_columns()` **as immutable after create**  
   OR allow host to flip it only while `status = 'waiting'` (see open questions).  
   Spec default for v1: **immutable after create** (simplest; set only in `/api/create-game`).

2. Index for the public list query:

```sql
CREATE INDEX IF NOT EXISTS games_public_waiting_idx
  ON games (created_at DESC)
  WHERE is_public = TRUE AND status = 'waiting';
```

3. Update `supabase/schema.sql` for greenfield installs (column + index + lock trigger).

4. `lib/types.ts`:

```ts
export interface Game {
  // ...
  /** Discoverable in Browse while waiting. Default false. */
  is_public?: boolean;
}

export interface CreateGamePayload {
  // ...
  /** When true, listed publicly until the host starts. Default false. */
  is_public?: boolean;
}
```

### 3.2 Listing eligibility (server truth)

A game appears in the public list **if and only if**:

```text
is_public = true
AND status = 'waiting'
AND created_at > now() - interval '…'   -- optional staleness cap (recommend 2–6h)
-- optional: player_count < MAX_PLAYERS (join still fails if full; filter improves UX)
```

When host starts the quiz, `useGameState` (or equivalent) sets `status` to `playing` (or `ready` if used). That **automatically** removes the room from the list — **no extra write** if listing is driven by `status`.

Do **not** require a separate “unlist” column unless you need public rooms that stay listed after start (you do not).

### 3.3 What not to expose in the list

| Field | List? | Why |
|-------|-------|-----|
| `id` | Yes (needed to join) | Join target |
| `topic` | Yes | Primary label |
| `difficulty` | Yes | At-a-glance |
| `num_questions` | Yes | At-a-glance |
| `mc_mode` | Optional | MC vs voice |
| `game_mode` | Optional | regular / hardcore |
| `cameras_enabled` | Optional | |
| `created_at` | Yes (relative time) | Freshness |
| **player count / slots free** | Yes if cheap | Avoid full rooms |
| `questions` / answers | **Never** | Spoiler + payload size |
| `host_user_id` | **Never** | Privacy |
| host display name | Optional | Needs join with `players` or denormalized field |

---

## 4. Security & API design

### 4.1 Problem with naive client SELECT

Current RLS: `games_select` is `USING (true)` — any client with the anon key can already `select *` all games if they know to query. A public browser would encourage that and would also return **private** games and full `questions` JSON if not careful.

**Do not** implement the room list as:

```ts
supabase.from('games').select('*').eq('is_public', true)...
```

from the browser without a restricted view/RPC.

### 4.2 Recommended approach: server API (or RPC)

**Option A — preferred for consistency with create-game:**

`GET /api/public-games` (or `GET /api/rooms`)

- Rate-limit (reuse `lib/rate-limit.ts`).
- Use **service role** (`getSupabaseAdmin`) **or** a Postgres view/RPC that only exposes safe columns.
- Query:

```sql
SELECT id, topic, difficulty, num_questions, mc_mode, game_mode,
       cameras_enabled, created_at, is_public, status
FROM games
WHERE is_public = true
  AND status = 'waiting'
  AND created_at > NOW() - INTERVAL '6 hours'
ORDER BY created_at DESC
LIMIT 30;
```

- Optionally left-join / subquery player counts:

```sql
(SELECT COUNT(*)::int FROM players p WHERE p.game_id = games.id) AS player_count
```

- Filter out `player_count >= 6` in SQL or after fetch.
- **Never** return `questions`.
- Response shape (return enough for the locked row fields; extra fields OK if cheap):

```ts
type PublicGameSummary = {
  id: string;
  topic: string;
  difficulty: Difficulty;
  num_questions: number;       // API may include; not shown on row in v1
  mc_mode: boolean;            // shown (MC vs voice)
  game_mode: GameMode;         // shown (regular / hardcore)
  cameras_enabled?: boolean;   // optional; not shown on row in v1
  created_at: string;          // shown as relative time
  player_count: number;        // shown as n/max
  max_players: number;         // always MAX_PLAYERS (6)
};
```

**Option B:** Supabase RPC `list_public_games()` with `SECURITY DEFINER`, granted to `anon`, returning only safe columns. Client calls RPC directly. Still rate-limit if possible.

### 4.3 Join path

Joining a public room reuses existing flow:

1. User selects a row → `router.push(/game/${id})` (guest, no `?role=host`).
2. Existing `JoinScreen` / auto-seat / `joinGame` / full check.

No new join protocol. Ensure full rooms show `join.full` as today.

### 4.4 Create path

In `app/api/create-game/route.ts`:

```ts
const isPublic = Boolean((body as Record<string, unknown>).is_public);
// insert { ..., is_public: isPublic }
```

Default `false` if omitted (back-compat for iOS / old clients).

### 4.5 Abuse notes (document for implementer)

- Public listing + free create can spam empty lobbies. Mitigations already partly present: host Google auth (web), rate limits, create quota (iOS). Optional later: require ≥1 guest before listing, CAPTCHA, hide rooms with 0 non-host players after N minutes.
- Listing only `waiting` + short TTL reduces clutter; cleanup cron (v12) already deletes old games.

---

## 5. UI components to add / change

### 5.1 `components/CreateGame.tsx`

| Change | Detail |
|--------|--------|
| Labels | More / Hide |
| State | `inviteOnly` default `true`; map to `is_public: !inviteOnly` in payload |
| Pending create | Persist `inviteOnly` / `is_public` in sessionStorage snapshot |
| First panel control | Browse entry → calls `onBrowseOpen()` (or sets parent home view) |
| Last control | Invite only toggle (same layout as MC/cameras) |
| Measure panel | Existing height measure still works (list is **not** inside the panel) |

### 5.2 New component (required)

`components/PublicGamesBrowser.tsx` (name flexible)

- Props: `onBack: () => void`
- Fetches `GET /api/public-games` on mount + manual Refresh
- Loading / empty / error states in keycap language
- Each row: **topic**, meta line with **difficulty · MC/voice · mode · n/6 · relative time**, **Join**
- Join → `router.push(/game/${id})` + optional `playSound('click')`
- Back → return to create view

### 5.3 `app/page.tsx`

**Required change:** home shell switches between create and browse.

```tsx
// Conceptual
const [homeView, setHomeView] = useState<'create' | 'browse'>('create');
// create: SetupBanner + HomeHeader + CreateGame(onBrowseOpen=…)
// browse: PublicGamesBrowser(onBack=…)  // may keep HomeDotTexture + optional compact header
```

Lift browse entry out of pure local CreateGame state so the **full page** can show the list.

### 5.4 Lobby (optional v1)

- Host-only line when `game.is_public`: “Visible in Browse until you start.”
- Guests: no change.

Requires `Game` type + fetch already including `is_public` (Supabase select `*` or explicit columns in game loaders).

### 5.5 i18n keys (suggested)

```ts
// create.*
moreShow: 'More',
moreHide: 'Hide',
browseOpenGames: 'Browse open games',
browseOpenGamesHint: 'Join a quiz waiting for players',
inviteOnlyTitle: 'Invite only',
inviteOnlyHintOn: 'Only people with your link can join. Hidden from the public list.',
inviteOnlyHintOff: 'Anyone can find this lobby until you start the quiz.',

// rooms.* (or create.rooms*)
roomsTitle: 'Open games',
roomsEmpty: 'No open games right now.',
roomsRefresh: 'Refresh',
roomsJoin: 'Join',
roomsPlayers: '{n}/{max}',
roomsLoading: 'Loading…',
roomsError: 'Could not load open games.',
// meta fragments as needed
```

Translate all locales shipped today.

---

## 6. Implementation checklist (ordered)

Use this as the PR / task list.

### PR / step 1 — Database

- [ ] Add migration `supabase/migration-vN-public-rooms.sql` (`is_public`, index, trigger lock update).
- [ ] Mirror changes in `supabase/schema.sql`.
- [ ] Run migration in Supabase SQL Editor (staging then prod).

### PR / step 2 — Types + create API

- [ ] `lib/types.ts`: `Game.is_public`, `CreateGamePayload.is_public`.
- [ ] `create-game` route: read `is_public`, insert default `false`.
- [ ] Confirm iOS / old clients omit field → private.

### PR / step 3 — List API

- [ ] `app/api/public-games/route.ts` (GET): rate limit, safe columns, player counts, limit, no questions.
- [ ] Manual test with two games (public waiting vs private / playing).

### PR / step 4 — Start quiz unlists (Rule R1)

- [ ] When host starts the quiz, update game with `status: 'playing'` **and** `is_public: false`.
- [ ] Ensure setup-column lock trigger **allows** this one transition for `is_public` (true → false only while starting), **or** perform the unlist via a small server endpoint / service-role path. Create-time-only for *becoming* public; start may only clear the flag.
- [ ] Rematch must not re-list (flag already false).

### PR / step 5 — Home UI

- [ ] Rename Adjust → More, Hide settings → Hide (all locales).
- [ ] Invite only toggle (default on) + wire to create payload (create-time only).
- [ ] Browse entry in More → home `homeView = 'browse'`.
- [ ] Full `PublicGamesBrowser` view + list rows + navigate to `/game/[id]`.
- [ ] Back returns to create view.

### PR / step 6 — Polish / docs

- [ ] Optional lobby badge for public rooms.
- [ ] Update `docs/ui-home-and-lobby.md` (More panel, browse full view).
- [ ] Update `PROJECT.md` features + schema sections if you keep it authoritative.
- [ ] Smoke: create private → not listed; create public → listed; start quiz → disappears forever; join full → full message.
- [ ] Keep `docs/GLOBAL_ROOMS_IOS.md` in sync if API response shape changes.

### PR / step 7 — Host kick (required)

- [ ] Migration: `game_bans` table (+ cascade on game delete); harden join against bans (RLS or check in join path).
- [ ] `POST /api/kick-player` (service role delete + ban; authorize host).
- [ ] Lobby UI: host-only Remove control per guest row.
- [ ] In-game: host can still kick (player list / status bar — keep subtle).
- [ ] Kicked client: clear “You were removed” + no silent rejoin.
- [ ] i18n for kick strings (all locales).
- [ ] Tests in §8 kick matrix.

### Out of scope for web v1

- Search/filter by topic text  
- Chat / room names separate from topic  
- Matchmaking auto-assign  
- Changing public/private mid-lobby  
- Showing public games that already started  
- Ranking / “popular” rooms  
- Permanent account bans / reports (kick is **per-game** only)  
- iOS UI (see `docs/GLOBAL_ROOMS_IOS.md`; web API must stay compatible)

---

## 7. Edge cases

| Case | Expected behavior |
|------|-------------------|
| Host creates public, nobody joins | Stays listed until start, abandon, or cleanup TTL |
| Host starts quiz | `status` → playing **and** `is_public = false` (R1) → gone from list forever |
| Room full (6 players) | Prefer hide from list; join via stale list still shows full |
| Guest has only link to private game | Works as today (`is_public=false`) |
| Guest has link to public game | Works; same join flow |
| Guest browses then host starts mid-click | Join may land on playing game — existing GameScreen must handle (already does if game exists) |
| Rematch | Same game row gets new questions; **`is_public` already false from Start** → never re-lists without a new create |
| Auth | Creating still requires Google on web; **browsing/joining public does not require auth** |
| Host kicks guest | Player row deleted; `client_id` banned for this `game_id`; seat free; kicked UI shown |
| Kicked user reloads / rejoins | Join fails (banned); stay on removed screen or error — **not** a new seat |
| Host tries to kick self | API rejects |
| Non-host calls kick API | API rejects |
| Kick during active question | Roster shrinks; early-advance / scoring use remaining players only |

**Rule R1 (locked):** When host starts (`status` → `playing`), also set `is_public = false`. Listing also requires `status = 'waiting'`, so either condition alone would hide the room; clearing the flag prevents rematch re-list.

---

## 8. Testing plan

1. **Private default:** Create without touching privacy → `is_public=false` → not in GET list.  
2. **Public create:** Turn off Invite only → create → appears in list with correct topic/meta.  
3. **Start unlist:** Host starts → refresh list → gone.  
4. **Join from list:** Second browser joins → seat + lobby; host can start.  
5. **Full room:** Fill 6 players → list excludes or join shows full.  
6. **Leak check:** List API response must not include `questions` or correct answers.  
7. **i18n:** EN + at least one other locale for new strings.  
8. **OAuth resume:** Pending create after Google sign-in still carries `is_public`.  
9. **Rate limit:** Burst GET `/api/public-games` returns 429 sensibly.  
10. **Kick:** Host removes guest in lobby → gone for others via realtime; kicked browser shows removed state.  
11. **Kick ban:** Same browser cannot reclaim a seat on that gameId.  
12. **Kick auth:** Guest cannot successfully call kick API.  
13. **Kick mid-game:** Host removes a player during a question; round still resolves for remaining players.

---

## 9. Copy sheet (final EN proposals)

| UI location | String |
|-------------|--------|
| Open panel button | More |
| Close panel button | Hide |
| Browse control title | Browse open games |
| Browse control hint | Join a quiz that’s waiting for players |
| Privacy title | Invite only |
| Privacy hint (on) | Only people with your link can join. Not shown in the public list. |
| Privacy hint (off) | Listed under Browse open games until you start the quiz. |
| List title | Open games |
| Empty | No open games right now. |
| Refresh | Refresh |
| Join row CTA | Join |
| Host remove control (aria / button) | Remove |
| Confirm kick (optional) | Remove {name} from this game? |
| Confirm kick confirm | Remove |
| Confirm kick cancel | Cancel |
| Kicked screen title | You were removed |
| Kicked screen body | The host removed you from this game. |
| Kicked screen CTA | Back to home |
| Kick error | Couldn’t remove that player. Try again. |
| Join banned | You can’t rejoin this game. |

---

## 10. Architecture sketch

```
Home (/)  homeView = 'create' | 'browse'
  create:
    CreateGame
      [Create challenge]
      [More]
        Browse open games ──► set homeView = 'browse'
        …settings…
        Invite only ──► is_public = !inviteOnly ──► POST /api/create-game

  browse:
    PublicGamesBrowser
      GET /api/public-games ──► rows ──► /game/[id]
      Back ──► homeView = 'create'

Lobby (status=waiting)
  Host Start quiz ──► status=playing AND is_public=false (R1)
  → room no longer matches list query (forever for this row)
```

---

## 11. Open questions (remaining soft defaults)

Most product questions are locked in §12. Remaining implementer defaults (change only if needed):

| Topic | Default if unspecified |
|-------|------------------------|
| Search / filter | None in v1 — newest first |
| Staleness TTL | 6 hours (`created_at`) |
| Solo host listed | Yes (1/6 is fine) |
| Auth for browse/join | Anonymous OK |
| EN copy | Use §9 sheet as shipped EN |

---

## 12. Decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Default privacy | **Invite only ON** (private by default) |
| 2 | Browse UI | **Separate full view on home** (entry from More; not in-panel list) |
| 3 | List fields | **Topic, player count (n/6), difficulty, MC vs voice + game mode, relative created time** |
| 4 | Search | None in v1 (browse only) |
| 5 | Staleness TTL | 6 hours (implementer default) |
| 6 | Rematch / unlist | **R1 — set `is_public=false` on Start** |
| 7 | Mid-lobby toggle | **Create-time only** |
| 8 | Join after start | Existing game/join behavior |
| 9 | iOS | **Web only for this ship**; detailed RN instructions in `docs/GLOBAL_ROOMS_IOS.md` |
| 10 | Anonymous browse | Yes |
| 11 | Final EN copy | §9 proposals (Browse open games / Invite only / More / Hide) |
| 12 | Solo host listed | Yes |
| 13 | Host kick | **Required** — lobby + in-game; ban by `(game_id, client_id)`; API + service role (§14) |

---

## 13. Non-goals / anti-patterns

- Do not put Browse as the primary home CTA above Create (stays under **More**).  
- Do not default new games to public.  
- Do not expand the room list *inside* the More panel (full view only).  
- Do not select full `games` rows (with `questions`) for the directory.  
- Do not invent a second join protocol or room codes unless product later asks (UUID link remains the join key).  
- Do not rename the product flow away from “topic quiz” — a “room” is still a `games` row in `waiting`.  
- Do not implement kick as a client-only `supabase.from('players').delete()` without service role — **RLS currently denies DELETE for anon** (by design).  
- Do not kick without a **per-game ban** — otherwise the bad actor reloads and rejoins instantly.

---

## 14. Host kick (required)

Public rooms make moderation mandatory. Kick is **required for v1** of global rooms (also available in private games).

### 14.1 Why this is non-trivial today

| Fact | Implication |
|------|-------------|
| `players` RLS: **no DELETE policy** for anon | Browser cannot delete seats; kick must use **service role** (API route) |
| Join is client-side insert via `joinGame` (`lib/supabase.ts`) | Without a ban check, kicked `client_id` can insert again |
| Host powers are mostly UI-gated client updates | Kick must **authorize** the caller as the real host, not any guest with the game UUID |
| Identity is `client_id` in localStorage | Ban key = `(game_id, client_id)` for this session’s browser |

### 14.2 Product behavior

| Rule | Detail |
|------|--------|
| Who can kick | Only the seated **host** (`players.role === 'host'`, slot 0) |
| Who can be kicked | Any **guest** (`role === 'player'`) in that game |
| Cannot kick | Host self; nonexistent player; player in another game |
| When | **Lobby** (`status === 'waiting'`) **and** during **play** / end screen (same control) |
| Effect | Delete target `players` row → seat free; record ban; WebRTC peers drop naturally when row vanishes |
| Rejoin | Banned `client_id` **cannot** take a new seat in **this** `game_id` (including rematch on same row) |
| Other games | Ban does **not** apply to other `game_id`s |
| Duration | Until the game row is deleted (cleanup cron / cascade) — no global user ban list in v1 |

### 14.3 Data model — `game_bans`

```sql
-- part of migration-vN-public-rooms.sql (or migration-vN-kick.sql)
CREATE TABLE IF NOT EXISTS game_bans (
  game_id    UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  client_id  TEXT NOT NULL,
  banned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- optional audit: who kicked (host player id or host_user_id)
  banned_by_player_id UUID NULL,
  PRIMARY KEY (game_id, client_id)
);

CREATE INDEX IF NOT EXISTS game_bans_game_id_idx ON game_bans (game_id);

ALTER TABLE game_bans ENABLE ROW LEVEL SECURITY;
-- No anon policies: only service role reads/writes bans.
-- (If you need client-side “am I banned?” checks, add a narrow SELECT
--  or return a clear error from join — prefer server-enforced insert deny.)
```

**Block rejoin (pick one; A preferred):**

**A — Extend `players_insert` RLS** so insert fails when banned:

```sql
-- conceptual WITH CHECK addition
AND NOT EXISTS (
  SELECT 1 FROM game_bans b
  WHERE b.game_id = game_id AND b.client_id = client_id
)
```

Note: RLS subqueries on `game_bans` require the inserting role to **SELECT** bans **or** use a `SECURITY DEFINER` helper. Cleaner pattern:

**B — `SECURITY DEFINER` function** `player_is_banned(game_id, client_id)` used in RLS, or

**C — Trigger `BEFORE INSERT ON players`** that raises if banned (runs as owner; no anon SELECT on bans needed).

Recommend **C (trigger)** for simplicity with existing open insert policy.

Also update `joinGame` in `lib/supabase.ts` to treat ban/insert failure as “cannot join” and surface `join.banned` in UI (do not spin forever).

### 14.4 API — `POST /api/kick-player`

**Path:** `app/api/kick-player/route.ts`  
**Auth model:** service role for DB writes; caller proves hostship.

**Request body:**

```ts
{
  gameId: string;           // UUID
  targetPlayerId: string;   // players.id of the guest to remove
  // Host proof (send both when available; server accepts if either path validates):
  hostClientId: string;     // localStorage client_id of the caller (must match host row)
  // Web: Authorization: Bearer <supabase access token> matching games.host_user_id
}
```

**Server steps:**

1. Rate-limit (reuse `lib/rate-limit.ts`; tighter than create if needed).  
2. Validate UUIDs.  
3. Load game; 404 if missing.  
4. **Authorize host** (either is enough on web; iOS uses client_id path):  
   - **Path A:** Bearer JWT → `admin.auth.getUser` → `user.id === game.host_user_id`  
   - **Path B:** `hostClientId` matches a `players` row for this game with `role === 'host'`  
5. Load target player: must exist, `game_id` match, `role === 'player'` (never delete host).  
6. In a transaction-ish sequence (service role):  
   - `INSERT INTO game_bans (game_id, client_id, banned_by_player_id) … ON CONFLICT DO NOTHING`  
   - `DELETE FROM players WHERE id = targetPlayerId AND game_id = gameId`  
7. Return `{ ok: true }`.

**Errors:**

| Status | When |
|--------|------|
| 401 / 403 | Not host / bad token |
| 404 | Game or target not found |
| 400 | Target is host, or self-kick, or bad body |
| 429 | Rate limited |
| 500 | DB failure |

**Do not** trust the client to pass “I am host” without verifying against DB.

### 14.5 Client — host UI

**Lobby (`components/Lobby.tsx`):**

For each player row where `me.role === 'host'` and `p.role === 'player'`:

- Show a small **Remove** control (secondary compact keycap, or icon button) on the trailing edge of the row.
- Optional confirm dialog: “Remove {name} from this game?”
- On confirm → `POST /api/kick-player` with `gameId`, `targetPlayerId: p.id`, `hostClientId`, and Bearer token if signed in.
- Loading state on that row; toast/error via existing error patterns if fail.
- Realtime `players` DELETE updates the list for everyone (subscription already listens to player changes — confirm DELETE events are included in `subscribeToPlayers`).

**During play:**

- Same capability on a host-visible control (e.g. long-press / menu on player chip in `PlayerStatusBar`, or a modest “Players” sheet).  
- Minimum bar: **lobby kick is mandatory**; in-game kick is **required** for public-room safety (bad actor mid-quiz). Prefer a compact host-only remove on the score/player strip so it stays subtle.

**Cannot show Remove** on host’s own row or to guests.

### 14.6 Client — kicked player UX

When a seated player’s row disappears and their `client_id` no longer has a seat:

1. Detect via realtime player list: had `me`, now `me === null`, and game still exists.  
2. Distinguish “left voluntarily” (if you add leave later) vs kicked: if join retry fails with banned / insert denied → **kicked**.  
   Practical approach: after losing seat, one join attempt → if banned, show removed screen.  
3. **Removed screen** (full viewport card, like game not found):  
   - Title: “You were removed”  
   - Body: “The host removed you from this game.”  
   - CTA: “Back to home” → `/`  
4. Do **not** keep camera mesh / speech running after kick.  
5. Clear any local “I’m in this game” optimistic state.

`GameScreen` should centralize this so lobby and in-game both work.

### 14.7 Game logic after kick

| System | Expected |
|--------|----------|
| Roster | `players.length` decreases; empty slot available for a **non-banned** joiner if still waiting |
| Early advance | “Everyone answered?” uses **current** roster only |
| Hardcore first | Only remaining players’ `answered_at` |
| Scores | Kicked player’s score gone with the row (no orphan) |
| Rematch votes | Host + remaining guests only |
| WebRTC | Peer connection to kicked id tears down when player list updates (`useMeshWebRTC`) |
| Start quiz min players | Still ≥2 including host; if kick drops below 2 in lobby, disable Start |

### 14.8 i18n keys (suggested)

```ts
lobby: {
  removePlayer: 'Remove',
  removeConfirm: 'Remove {name} from this game?',
  removeConfirmYes: 'Remove',
  removeConfirmNo: 'Cancel',
  removeError: 'Couldn’t remove that player. Try again.',
},
game: {
  removedTitle: 'You were removed',
  removedBody: 'The host removed you from this game.',
  removedHome: 'Back to home',
},
join: {
  banned: 'You can’t rejoin this game.',
},
```

### 14.9 Security notes

- Kick without ban is useless against a determined guest.  
- Ban by `client_id` is **best-effort** (clearing site data gets a new id) — good enough for casual griefing; not a legal identity ban.  
- Do not expose full ban lists to clients.  
- Prefer not to open general `players` DELETE RLS to anon.  
- Rate-limit kick to prevent host-token abuse loops.

### 14.10 Checklist (kick-only)

- [ ] `game_bans` + cascade + insert-block trigger/RLS  
- [ ] `POST /api/kick-player`  
- [ ] Lobby Remove UI (host only)  
- [ ] In-game Remove (host only)  
- [ ] Kicked full-screen state  
- [ ] `joinGame` / join UI handles ban  
- [ ] Realtime DELETE refreshes rosters  
- [ ] Early-advance / start-button edge cases  
- [ ] All locales  
- [ ] Document for iOS in `GLOBAL_ROOMS_IOS.md`

---

*End of web instructions. For React Native, see `docs/GLOBAL_ROOMS_IOS.md`.*
