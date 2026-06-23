# WhoSmarter — Sound Effects (iOS / React Native parity spec)

**Purpose:** Implement the same sound effects as the web app (`lib/sounds.ts` + `hooks/useGameSounds.ts`).  
**Web reference (commit `05873eb`):** `lib/sounds.ts`, `hooks/useGameSounds.ts`, `components/SoundToggle.tsx`

Send this file to whoever ports the RN iOS client. It is self-contained — no need to read the web repo for SFX.

---

## 1. Sound catalog (15 IDs)

All web sounds are **procedural tones** (Web Audio oscillators). On RN you can either:

| Approach | Pros | Cons |
|----------|------|------|
| **A. Bundle WAV/CAF files** (recommended) | Reliable on iOS, works with `expo-av`, no audio-session fights | Export 15 short files once (see §2) |
| **B. `react-native-audio-api`** | Near-identical synthesis to web | Extra native dep, test with WebRTC mic |
| **C. Third-party SFX library** | Fast | Won’t match web unless you tune manually |

Use the **same string IDs** everywhere so game logic stays aligned with web.

```ts
export type SoundId =
  | 'click'
  | 'join'
  | 'start'
  | 'go'
  | 'nextRound'
  | 'answerOther'
  | 'answerSelf'
  | 'tick'
  | 'correct'
  | 'wrong'
  | 'reveal'
  | 'winner'
  | 'tie'
  | 'point'
  | 'vote';
```

### Mute preference (parity with web)

| Key | Value | Storage |
|-----|-------|---------|
| `whosmarter-sounds-muted` | `'1'` = muted, absent/`'0'` = on | AsyncStorage (web uses `localStorage`) |

Check before every `playSound`. Expose a speaker toggle like web `SoundToggle` (top-right).

---

## 2. Exact tone recipes (for WAV export or synthesis)

Base volume on web: `v = 0.11`. Each tone uses exponential decay to ~0.001 over `duration` seconds.

Helper: `tone(freqHz, startOffsetSec, durationSec, waveType, volumeMultiplier)`

| SoundId | Description | Tones |
|---------|-------------|-------|
| `click` | UI tap | 720 Hz, 0.04s, square, vol×0.45 |
| `join` | Player joined lobby | 523 Hz 0.09s sine; 659 Hz +0.07s 0.11s sine |
| `start` | Match begins | 392 +0s 0.1s; 523 +0.09s 0.1s; 659 +0.18s 0.12s; 784 +0.3s 0.18s vol×1.1 |
| `go` | Think lock lifts (“GO!”) | 880 +0s 0.07s square vol×0.55; 1174 +0.05s 0.14s sine |
| `nextRound` | New question index | 440 +0s 0.08s vol×0.7; 554 +0.09s 0.1s vol×0.8 |
| `answerOther` | Another player answered | 494 Hz 0.05s triangle vol×0.75 |
| `answerSelf` | You locked in | 600 +0s 0.05s; 800 +0.05s 0.07s vol×0.85 |
| `tick` | Timer ≤3s | 1046 Hz 0.035s square vol×0.35 |
| `correct` | You were right | 523 +0s 0.09s; 659 +0.09s 0.09s; 784 +0.18s 0.18s vol×1.1 |
| `wrong` | You were wrong | 349 +0s 0.12s sawtooth vol×0.45; 262 +0.1s 0.16s vol×0.35 |
| `reveal` | Result phase opens | 220 +0s 0.07s vol×0.75; 330 +0.09s 0.18s |
| `winner` | Sole winner at game end | 523/659/784/1046 each +0/0.11/0.22/0.33s 0.18s; 1046 +0.48s 0.35s vol×1.2 |
| `tie` | Tie or 0 points at end | 440 +0s 0.14s; 440 +0.18s 0.14s vol×0.75 |
| `point` | Score increased (opponent, or you without correct/wrong) | 880 Hz 0.07s vol×0.55 |
| `vote` | Rematch vote cast | 587 +0s 0.06s vol×0.65; 740 +0.06s 0.08s vol×0.55 |

**Suggested bundled assets** (if using Approach A):

```
assets/sounds/
  click.caf
  join.caf
  start.caf
  go.caf
  nextRound.caf
  answerOther.caf
  answerSelf.caf
  tick.caf
  correct.caf
  wrong.caf
  reveal.caf
  winner.caf
  tie.caf
  point.caf
  vote.caf
```

Export from the web app in a browser console, or use any DAW. Keep files &lt; 1s each (except `winner` ~0.9s).

---

## 3. When to play each sound

### 3.1 Automatic — `useGameSounds` hook

Mount **once** in `GameScreen` (same as web). Inputs: `game`, `players`, `me`, `timeLeft` (integer seconds from server-synced deadline).

**Critical:** On first render with valid `game` + `me`, **record state but play nothing** (avoids SFX burst on reconnect).

```ts
function hasAnswered(p: Player, mcMode: boolean): boolean {
  return mcMode ? p.mc_index !== null : p.done;
}
```

#### Refs to keep (initialize on first “ready” pass)

| Ref | Tracks |
|-----|--------|
| `ready` | First snapshot taken |
| `prevPhase` | `game.phase` |
| `prevStatus` | `game.status` |
| `prevQuestionIndex` | `game.current_question_index` |
| `prevPlayerIds` | `Set<player.id>` |
| `prevAnswered` | `Record<playerId, boolean>` |
| `prevScores` | `Record<playerId, number>` |
| `prevCorrect` | `me.correct` |
| `prevRematchVote` | `me.rematch` |
| `lastTickSecond` | last `timeLeft` that fired `tick` |

#### Event rules (order matters within one effect run)

| # | Condition | Sound |
|---|-----------|-------|
| 1 | New `player.id` in roster (lobby) | `join` (once per batch) |
| 2 | `prevStatus === 'waiting'` && `status === 'playing'` | `start` |
| 3 | `status === 'playing'` && `current_question_index` increased && prev index ≥ 0 | `nextRound` |
| 4 | Phase: `thinking` → `question` OR `answering` | `go` |
| 5 | Phase → `result` (was not `result`) | `reveal` |
| 6 | Phase → `ended` (was not `ended`) | If `topScore === 0` OR multiple winners → `tie`; else sole winner → `winner` |
| 7 | For each player: `answered` false → true | `me` → `answerSelf`; else → `answerOther` |
| 8 | `phase === 'result'` && `me.correct` changed from previous non-null transition | `correct` or `wrong` |
| 9 | Any player `score` increased | `point` — **skip for `me` if #8 just played** |
| 10 | `me.rematch` false → true | `vote` |

**Winner logic (#6):**

```ts
const ranked = [...players].sort((a, b) => b.score - a.score || a.slot - b.slot);
const topScore = ranked[0]?.score ?? 0;
const winners = ranked.filter((p) => p.score === topScore && topScore > 0);
const isTieOrNoPoints = topScore === 0 || winners.length !== 1;
```

#### Timer ticks (separate effect on `timeLeft`)

| Condition | Sound |
|-----------|-------|
| Phase is `thinking`, `question`, or `answering` | |
| `timeLeft` is 1, 2, or 3 (not 0, not &gt;3) | `tick` |
| Only once per second (don’t repeat if `timeLeft` unchanged) | |
| Clear `lastTickSecond` when phase changes or leaves timed phases | |

---

### 3.2 Manual — UI buttons (`playSound('click')`)

Call **before** the action (same as web):

| Screen | Action |
|--------|--------|
| **CreateGame** | Submit create form |
| **CreateGame** | Copy share link |
| **CreateGame** | “Go to game” (host) |
| **JoinScreen** | Submit join |
| **Lobby** | Copy invite link |
| **Lobby** | Host “Start” (then `start` plays via hook when status flips) |

MC option tap does **not** call `click` on web — only `answerSelf` via hook when `mc_index` updates.

---

## 4. React Native implementation sketch

### 4.1 `lib/sounds.ts` (expo-av)

```ts
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MUTE_KEY = 'whosmarter-sounds-muted';

const FILES: Record<SoundId, number> = {
  click: require('../assets/sounds/click.caf'),
  join: require('../assets/sounds/join.caf'),
  // ... all 15
};

let soundsMuted = false;

export async function initSounds() {
  soundsMuted = (await AsyncStorage.getItem(MUTE_KEY)) === '1';
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    allowsRecordingIOS: true, // required if mic / WebRTC active
    staysActiveInBackground: false,
  });
}

export async function isSoundsMuted() {
  return soundsMuted;
}

export async function setSoundsMuted(muted: boolean) {
  soundsMuted = muted;
  await AsyncStorage.setItem(MUTE_KEY, muted ? '1' : '0');
}

export async function playSound(id: SoundId) {
  if (soundsMuted) return;
  const { sound } = await Audio.Sound.createAsync(FILES[id]);
  sound.setOnPlaybackStatusUpdate((s) => {
    if (s.isLoaded && s.didJustFinish) sound.unloadAsync();
  });
  await sound.playAsync();
}
```

Call `initSounds()` once at app root (e.g. before first game).

### 4.2 `hooks/useGameSounds.ts`

Port `hooks/useGameSounds.ts` from web **line-for-line** — replace only the `playSound` import. Same refs, same two `useEffect` blocks.

### 4.3 `SoundToggle`

Small pressable with speaker / speaker-off icon; toggles `setSoundsMuted`; fixed top-right with safe-area insets (match web).

Show on: home/create, join, lobby, game screen.

---

## 5. iOS audio session notes

Web shares one `AudioContext` with mic analysis. On iOS you will also have:

- **WebRTC** (`react-native-webrtc`) — `playAndRecord`
- **Speech recognition** (`@react-native-voice/voice`) during `answering`
- **SFX** — short playback

**Recommendations:**

1. Configure `AVAudioSession` category `playAndRecord` with `defaultToSpeaker` and `allowBluetooth` (Expo `Audio.setAudioModeAsync` as above).
2. SFX are short — avoid stopping/recreating the session per sound.
3. If SFX are swallowed during `answering`, test mixing: iOS usually allows playback + recording in `playAndRecord`.
4. Do **not** route game SFX through WebRTC — local speaker only (same as web).

---

## 6. Parity checklist

- [ ] All 15 `SoundId` values implemented
- [ ] Mute key `whosmarter-sounds-muted` in AsyncStorage
- [ ] `useGameSounds` mounted in `GameScreen` with `timeLeft` from server-synced ticker
- [ ] No sounds on initial load / reconnect (ready ref)
- [ ] `answerOther` when remote player sets `mc_index` or `done`
- [ ] `answerSelf` when local player sets `mc_index` or `done`
- [ ] `tick` only for `timeLeft` 1–3 in timed phases
- [ ] `correct`/`wrong` on `me.correct` transition during `result`
- [ ] `point` on opponent score up; skip duplicate for self if correct/wrong played
- [ ] `winner` vs `tie` at `phase === 'ended'`
- [ ] `click` on listed UI buttons
- [ ] Speaker toggle visible on game flows
- [ ] `playsInSilentModeIOS: true` so sounds work when ringer is off

---

## 7. Web source map

| Web file | RN target |
|----------|-----------|
| `lib/sounds.ts` | `lib/sounds.ts` (or `services/sounds.ts`) |
| `hooks/useGameSounds.ts` | `hooks/useGameSounds.ts` |
| `components/SoundToggle.tsx` | `components/SoundToggle.tsx` |
| `components/GameScreen.tsx` | `useGameSounds({ game, players, me, timeLeft })` |
| `components/Lobby.tsx` | `playSound('click')` on copy + start |
| `components/JoinScreen.tsx` | `playSound('click')` on join |
| `components/CreateGame.tsx` | `playSound('click')` on create / copy / go |

---

## 8. Quick test script (on device)

1. Lobby: second player joins → `join`
2. Host starts → `start` + `click`
3. Think mode: wait → `go`; timer 3-2-1 → `tick`
4. MC: opponent picks first → `answerOther`; you pick → `answerSelf`
5. Result → `reveal`; correct/wrong per player
6. Next question → `nextRound`
7. Game end: one winner → `winner`; tie → `tie`
8. Vote rematch → `vote`
9. Mute toggle → no sounds until unmuted

---

*Generated from web WhoSmarter — keep in sync if `lib/sounds.ts` or `hooks/useGameSounds.ts` change.*
