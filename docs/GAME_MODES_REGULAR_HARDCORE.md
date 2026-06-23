# Game Modes Spec — Every Answer Counts & Only First Answer Counts

This document describes the **two current game modes** as implemented in the WhoSmarter web app. Use it to match behavior in the iOS / React Native client against the same Supabase backend.

**Display names (UI):**

| DB value | UI label |
|----------|----------|
| `'regular'` | **Every answer counts** |
| `'hardcore'` | **Only first answer counts** |

---

## Database values

| Field | Location | Values |
|-------|----------|--------|
| `games.game_mode` | `games` table | `'regular'` (default) or `'hardcore'` |
| `players.answered_at` | `players` table | ISO timestamp or `NULL` — reset each round |

Legacy values `'think'` and `'classic'` still exist in old rows but are **not offered in the create UI anymore**. You only need to implement `'regular'` and `'hardcore'` for new games.

When creating a game, send:

```json
{ "game_mode": "regular" }
```

or

```json
{ "game_mode": "hardcore" }
```

**Migration:** run `supabase/migration-v4-modes.sql` once in the Supabase SQL Editor (adds `players.answered_at` and expands the `game_mode` check constraint).

---

## Shared behavior (both modes)

These rules apply to **Every answer counts** and **Only first answer counts** equally.

### Round start — no thinking phase

Unlike the old `think` mode, **there is no locked “get ready” countdown**. When a question opens, players can answer immediately.

Round start sets:

- **Multiple choice** (`mc_mode = true`): `phase = 'question'`, `phase_deadline = now + 20s`
- **Voice / open-ended** (`mc_mode = false`): `phase = 'answering'`, `phase_deadline = now + 20s`

### Timer — fixed 20 seconds, never shrinks

| Constant | Value |
|----------|-------|
| MC answer time | **20 seconds** |
| Voice answer time | **20 seconds** |
| Result screen | 5 seconds |
| AI checking (voice safety timeout) | 15 seconds |

**The timer does NOT drop to 4 seconds** when someone answers first. That shrink behavior exists only in legacy `'think'` / `'classic'` games.

The round ends when:

1. **`phase_deadline` expires**, or
2. **Early advance**: every player has answered before the timer runs out (see below)

### Early advance

A player is considered “answered” when:

- **MC**: `mc_index !== null`
- **Voice**: `done === true`

If **every** player in the roster has answered, the round resolves immediately (no need to wait for the full 20s).

### Round flow

**Multiple choice:**

```
question (20s) → result (5s) → next question
```

**Voice:**

```
answering (20s) → checking (AI judge, up to 15s safety) → result (5s) → next question
```

### Per-round player reset

At the start of each new question, reset on every player row:

```
mc_index = null
transcript = ''
correct = null
done = false
answered_at = null
```

### Server clock sync (required for “Only first answer counts” fairness)

All deadlines and `answered_at` timestamps use **server time**, not raw device time.

1. Sync device clock to Supabase server time (web app reads the HTTP `Date` header from the Supabase REST endpoint).
2. Store `answered_at = serverNow()` as an ISO string **at the moment the player commits locally**.
3. Do **not** wait for the network round-trip to stamp the time — that would favor fast connections.

Accuracy is ~1 second, which is enough to remove the multi-second skew that made fast Wi‑Fi “win” unfairly.

Web implementation: `syncServerClock()` and `serverNow()` in `lib/supabase.ts`.

---

## Mode 1: Every answer counts (default)

**DB value:** `'regular'`

**Player-facing label:** “Every answer counts”

**Design goal:** cooperative quiz — everyone who gets it right scores; no rush mechanics.

### Scoring

- **+1 point per correct answer per round**
- Multiple players can score on the same question
- Wrong answers score 0

### Multiple choice

| Rule | Behavior |
|------|----------|
| When can you answer? | Immediately when `phase = 'question'` |
| Can you change your pick? | **Yes** — until the timer ends |
| When is pick locked? | Never during the round; final pick at resolve time is what counts |
| `answered_at` | Set on **first** pick only (informational; not used for scoring in this mode) |

**Client logic:**

```typescript
if (phase !== 'question') return;
// Always allow updating mc_index until timer ends
const patch: Partial<Player> = { mc_index: optionIndex };
if (my.mc_index === null) {
  patch.answered_at = new Date(serverNow()).toISOString();
}
await updatePlayer(myId, patch);
```

**UI hint (English):** “You can still change · {timeLeft}s” after picking.

### Voice / open-ended

| Rule | Behavior |
|------|----------|
| When can you answer? | Immediately when `phase = 'answering'` |
| One shot? | **No** — you can keep speaking/typing until the timer ends |
| Lock-in | Optional — pressing “Done” / releasing hold sets `done = true` early |
| If timer expires without `done` | Still judge whatever is in `transcript` (web auto-submits on phase change) |
| Scoring | Every player judged independently; all correct answers get +1 |

**Client logic:**

- `updateTranscript(text)` — allowed freely during `answering`
- `finishAnswer(text)` — optional early lock-in; sets `done = true`
- On resolve: call `POST /api/check-answer` for each player’s `transcript`; score all correct

### Timer shrink on first answer?

**No.**

---

## Mode 2: Only first answer counts

**DB value:** `'hardcore'`

**Player-facing label:** “Only first answer counts”

**Design goal:** competitive speed quiz — only the **first correct** answer earns a point; answers lock on submit.

### Scoring

- **+1 point only for the single earliest correct answer** in the round
- All other players get 0 for that round (even if they were also correct)
- “Earliest” = smallest `answered_at` among players whose final answer is **correct**

**MC resolve:**

```typescript
const correctOf = (p: Player) =>
  p.mc_index != null &&
  isMcAnswerCorrect(q.options[p.mc_index], q.correct_answer);

const correctPlayers = roster.filter(correctOf);
const winnerId =
  correctPlayers.sort((a, b) => answeredMs(a) - answeredMs(b))[0]?.id ?? null;

// winner gets +1, everyone else gets +0
// still set correct=true/false on each player for UI reveal
```

**Voice resolve:**

```typescript
const results = await Promise.all(
  roster.map(async (p) => ({
    id: p.id,
    score: p.score,
    answeredAt: p.answered_at ? new Date(p.answered_at).getTime() : Infinity,
    correct: await judge(p.transcript), // POST /api/check-answer
  }))
);

const winnerId =
  results
    .filter((r) => r.correct)
    .sort((a, b) => a.answeredAt - b.answeredAt)[0]?.id ?? null;

// only winner gets +1
```

**Tie on `answered_at`:** sort is stable; in practice ties within ~1ms are extremely rare. If tied, first in sorted array wins (implementation detail — match web sort).

### Multiple choice

| Rule | Behavior |
|------|----------|
| When can you answer? | Immediately when `phase = 'question'` |
| Can you change your pick? | **No** — first tap locks your pick |
| `answered_at` | Set on **first** pick; never updated |
| Wrong first pick | Stuck with it for the round → 0 points |

**Client logic:**

```typescript
if (phase !== 'question') return;
if (my.mc_index !== null) return; // already locked
await updatePlayer(myId, {
  mc_index: optionIndex,
  answered_at: new Date(serverNow()).toISOString(),
});
```

**UI hint (English):** “Answer locked in · {timeLeft}s” after picking.

### Voice / open-ended

| Rule | Behavior |
|------|----------|
| When can you answer? | Immediately when `phase = 'answering'` |
| One shot? | **Yes** — one submission per round |
| After submit | `done = true`; block further input (no re-speaking, no re-typing) |
| Wrong submission | 0 points for this question; cannot try again |
| `answered_at` | Set when `finishAnswer` is called (first and only commit) |
| Live transcript updates | Allowed **before** submit; after `done = true`, block edits |

**Why one shot:** prevents players from saying many variants hoping one will match (e.g. “Paris… London… Berlin…”).

**Client logic:**

```typescript
if (my.done) return; // already submitted
await updatePlayer(myId, {
  done: true,
  transcript: finalText,
  answered_at: new Date(serverNow()).toISOString(),
});
// Disable mic, text field, and submit button
```

### Timer shrink on first answer?

**No** — same 20s fixed timer as “Every answer counts”.

### Round does NOT end when first correct answer arrives

The round continues until the timer expires or **everyone** has submitted. This is intentional: it keeps timing fair and lets slower players still participate (they just won’t score if someone else was first and correct).

---

## Side-by-side comparison

| | **Every answer counts** | **Only first answer counts** |
|---|-------------|--------------|
| Default? | Yes | No |
| Start of round | Immediate | Immediate |
| Thinking phase | No | No |
| Answer timer | 20s fixed | 20s fixed |
| Timer shrinks when someone answers? | No | No |
| MC: change answer? | Yes, until timer ends | No — locks on first tap |
| Voice: multiple attempts? | Yes, until timer ends | No — one submission |
| Who scores? | Everyone correct (+1 each) | Only earliest correct (+1 total) |
| Uses `answered_at`? | Stored, not used for scoring | **Required** for winner selection |
| Early end | When all players answered | When all players answered |

---

## `answered_at` — detailed rules

| Event | Set `answered_at`? | Updates on change? |
|-------|-------------------|-------------------|
| Every answer counts — MC first pick | Yes | No (stays at first-pick time) |
| Every answer counts — MC change pick | No | No |
| Only first answer counts — MC first pick | Yes | No |
| Every answer counts — voice `finishAnswer` | Yes, if not already set | No |
| Only first answer counts — voice `finishAnswer` | Yes | No |
| Every answer counts — voice timer auto-submit | Yes, if not already set | No |

**Value format:** ISO 8601 string, e.g. `"2026-06-23T20:15:03.421Z"`

**Computed locally** using synced server clock at commit time, then written to Supabase.

---

## UI copy (English — create screen)

**Every answer counts**

> Answer right away. You can change your pick until the timer ends, and the full time always stays — everyone who answers correctly scores. The round ends early only if everyone has answered.

**Only first answer counts**

> Only the first correct answer scores. Your answer locks the instant you submit — no changing it, and voice answers get one shot. Answers are ranked by a synced clock, so a faster connection barely matters.

---

## Web source files (reference)

| Concern | File |
|---------|------|
| Game loop, scoring, timers | `hooks/useGameState.ts` |
| Types | `lib/types.ts` |
| Server clock, player reset | `lib/supabase.ts` |
| Create-game mode picker | `components/CreateGame.tsx` |
| In-game MC / status UI | `components/QuestionPanel.tsx` |
| Voice answer flow | `components/GameScreen.tsx` |
| AI judging | `app/api/check-answer/route.ts` |
| DB schema | `supabase/schema.sql` |
| Migration | `supabase/migration-v4-modes.sql` |

---

## iOS / React Native implementation checklist

1. **Create game screen** — two options: “Every answer counts” (`regular`, default) and “Only first answer counts” (`hardcore`); write `game_mode` to Supabase.
2. **Sync server clock** on join and every ~30s (match web).
3. **Round start** — skip `thinking` phase; go straight to `question` or `answering` with 20s deadline.
4. **Do not implement timer shrink** for these modes.
5. **Every answer counts — MC** — allow re-tapping options until deadline.
6. **Only first answer counts — MC** — disable options after first tap; set `answered_at`.
7. **Every answer counts — voice** — allow edit until deadline; judge all correct at end.
8. **Only first answer counts — voice** — one submit; set `done + answered_at`; disable input after.
9. **Resolve MC** — fetch fresh player rows; apply scoring rules above.
10. **Resolve voice** — POST each transcript to `/api/check-answer`; apply scoring rules.
11. **Early advance** — when all players answered, trigger resolve without waiting for timer.
12. **Reset** — clear `answered_at` each round (`resetPlayersForRound` or equivalent).
13. **Run migration** `supabase/migration-v4-modes.sql` if not already applied.

---

## Legacy modes (read-only compatibility)

If the client joins an **old** game row:

| `game_mode` | Behavior |
|-------------|----------|
| `'think'` | 5s locked `thinking` phase, then answer; timer shrinks to 4s on first answer |
| `'classic'` | Immediate answer; timer shrinks to 4s on first answer |

You don’t need to offer these in the create UI, but handle them if `game_mode` is not `'regular'` or `'hardcore'`.

Legacy timer shrink constant: `FIRST_ANSWER_GRACE_SECONDS = 4`.

---

## Constants summary (copy-paste for RN)

```typescript
export const QUESTION_TIME_SECONDS = 20;
export const VOICE_ANSWER_SECONDS = 20;
export const RESULT_TIME_SECONDS = 5;
export const CHECK_TIMEOUT_SECONDS = 15;

// Legacy only — NOT used in regular/hardcore
export const THINK_TIME_SECONDS = 5;
export const FIRST_ANSWER_GRACE_SECONDS = 4;

export type GameMode = 'regular' | 'hardcore' | 'think' | 'classic';

function shrinksOnFirstAnswer(mode: GameMode): boolean {
  return mode === 'think' || mode === 'classic';
}

function hasAnswered(p: Player, mcMode: boolean): boolean {
  return mcMode ? p.mc_index !== null : p.done;
}
```
