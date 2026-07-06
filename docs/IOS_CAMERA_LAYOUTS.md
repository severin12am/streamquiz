# iOS Camera Layout Modes — Implementation Spec

**Audience:** Cursor agent building the React Native iOS app (separate window/repo).  
**Scope:** Portrait iPhone only — **no landscape**, no iPad-specific layouts in v1.  
**Do not port** the web `CameraGrid.tsx` layout (web uses top-**left** PiP and 3 modes). The iOS app has its **own** layout system described here.

Reference screenshot (2-player MC round): local player full-screen stage, remote player in **top-right** PiP, quiz UI overlaid top + bottom.

---

## Hard rules (non-negotiable)

1. **At most one PiP.** There is never a second, third, or stacked PiP. Modes that use PiP show **exactly one** small tile top-right, or **zero** PiPs.
2. **Letterbox (mode 4) fits at most two feeds.** The middle band between top UI and bottom UI is too small for 3+ equal tiles. Mode 4 is **only used when the game has exactly 2 players**. With 3–6 players, **skip mode 4** when cycling (mode 3 → mode 0).

---

## 1. Screen anatomy (fixed — never changes between modes)

```
┌─────────────────────────────┐
│ ◀  Game              Logs │  ← App nav bar (not part of camera layer)
├─────────────────────────────┤
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  ← TOP UI RESERVE (see §2)
│  timer strip                │
│  question box               │
│  score chips                │
├─────────────────────────────┤
│                             │
│      CAMERA STAGE           │  ← Layout modes control ONLY this band
│      (variable)             │     (+ optional single PiP floating above)
│                        (🎤) │  ← Floating mic toggle (right edge, mid)
├─────────────────────────────┤
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  ← BOTTOM UI RESERVE (see §2)
│  MC 2×2  OR  voice controls │
├─────────────────────────────┤
│        home indicator       │
└─────────────────────────────┘
```

Orange rounded border frames the **game content area** (between nav and home indicator) — match existing app styling.

### 1.1 Top UI reserve (always visible during play)

Render **above** camera feeds (higher z-index). Contents match current app:

| Element | Notes |
|---------|--------|
| Timer strip | Horizontal bar, mic icon left, seconds right |
| Question box | Frosted/dark rounded rect, question text + `N/M` counter |
| Scoreboard | Pill row: colored dot + truncated name + score per player |

### 1.2 Bottom UI reserve (always visible during play)

| Mode | Contents |
|------|----------|
| MC | 2×2 answer buttons (A–D) |
| Voice | Transcript area + text field + hold-to-answer button |

### 1.3 Camera tile chrome (every feed)

Each `RTCView` tile shows:

- **Colored border** = `playerColor(slot)` (1–2 pt)
- **Name label** bottom-left inside tile: colored dot + uppercase/truncated name
- **Mic indicator** top-left when that peer's mic is hot (optional v1 — match screenshot)
- **Result badge** ✓/✗ during `phase === 'result'` (parity with web `CameraPanel`)
- **Placeholder avatar** (colored initial) when `cameras_enabled === false`

Local feed: mirror horizontally (`transform: [{ scaleX: -1 }]`).

### 1.4 PiP slot (when used — never more than one)

- **Position:** top-**right** of the game content area (NOT top-left like web).
- **Insets:** `top = safeAreaTop + navBarHeight + 8`, `right = 12`.
- **Size:** ~30% screen width × ~22% screen height (tune to match screenshot).
- **Count:** **1 tile maximum.** Never stack multiple PiPs.
- PiP may **overlap** the stage and partially overlap top UI in modes 0–3 (same as current screenshot). Mode 4 (letterbox) uses **no PiP** and must **not** overlap UI reserves.

---

## 2. Measuring UI reserves (required for mode 4, 2-player only)

Mode 4 (“letterbox”) needs pixel-accurate bands. On `GameScreen` mount and when question/MC layout changes:

```typescript
const [topUIHeight, setTopUIHeight] = useState(0);
const [bottomUIHeight, setBottomUIHeight] = useState(0);

// Wrap top overlay in <View onLayout={e => setTopUIHeight(e.nativeEvent.layout.height)} />
// Wrap bottom overlay in <View onLayout={...} />

const cameraBandTop = topUIHeight;
const cameraBandHeight = screenHeight - topUIHeight - bottomUIHeight - navBarHeight - homeIndicator;
```

In mode 4, **exactly two** feeds sit side-by-side (or stacked if band is narrow) **only** inside `[cameraBandTop, cameraBandTop + cameraBandHeight]`. Top and bottom UI panels are opaque/blurred — no video underneath.

---

## 3. Interaction

```typescript
const MODES_2P = 5;  // indices 0..4
const MODES_3P_PLUS = 4;  // indices 0..3 — no letterbox

function layoutModeCount(playerCount: number): number {
  return playerCount === 2 ? MODES_2P : MODES_3P_PLUS;
}

const [layoutMode, setLayoutMode] = useState(0);
const cycleLayout = (playerCount: number) =>
  setLayoutMode(m => (m + 1) % layoutModeCount(playerCount));
```

| Rule | Behavior |
|------|----------|
| Trigger | Tap **any camera tile** (stage or the single PiP) |
| Scope | **Local only** — do not sync via Supabase |
| Solo lobby | `others.length === 0` → single full-screen self feed; **disable** cycling |
| 2 players | Cycle 0 → 1 → 2 → 3 → 4 → 0 |
| 3–6 players | Cycle 0 → 1 → 2 → 3 → 0 (**skip** letterbox) |

When player count changes mid-session (e.g. lobby → game start), clamp: `setLayoutMode(m => m % layoutModeCount(players.length))`.

Attach `onPress={cycleLayout}` to each visible camera tile. Quiz UI buttons must **not** trigger layout cycle.

---

## 4. Mode definitions (all player counts)

Let `others` = remote players sorted by `slot` ascending.  
Let `pipOther` = `others[0]` (lowest slot) — the **one** remote allowed in PiP when mode calls for “an other”.

| Index | Name | PiP (≤1) | Stage / split |
|-------|------|----------|---------------|
| **0** | default | **you** | All `others` on stage (grid) |
| **1** | other PiP | **`pipOther`** (one remote only) | **you** + all `others` except `pipOther` on stage |
| **2** | you top | none | **you** top 50%; all `others` bottom 50% (grid) |
| **3** | others top | none | all `others` top 50% (grid); **you** bottom 50% |
| **4** | letterbox | none | **2-player games only:** **you** + **`pipOther`** equal in middle band; no UI on video |

### 4.1 Two-player special cases

With exactly one remote (`other = others[0]`), mode 1 simplifies to: **you** full stage, **other** in PiP (no extra stage tiles). Mode 4 shows **you + other** in the middle band only.

| Index | 2-player layout |
|-------|-----------------|
| **0** | **other** full stage · **you** PiP |
| **1** | **you** full stage · **other** PiP |
| **2** | **you** top half · **other** bottom half |
| **3** | **other** top half · **you** bottom half |
| **4** | letterbox: **you** + **other** in middle band (order by slot); top/bottom UI opaque |

### 4.2 Wireframes (2 players)

**Mode 0 — default (you PiP):**

```
┌─────────────────────────────┐
│ TOP UI                      │
│                   ┌───────┐ │
│                   │ YOU   │ │  ← only PiP
│   OTHER (full)    └───────┘ │
│ BOTTOM UI                   │
└─────────────────────────────┘
```

**Mode 1 — other PiP** (matches shared screenshot if local = JUJU):

```
┌─────────────────────────────┐
│ TOP UI                      │
│                   ┌───────┐ │
│                   │ OTHER │ │  ← only PiP
│   YOU (full)      └───────┘ │
│ BOTTOM UI                   │
└─────────────────────────────┘
```

**Mode 2 / 3 — 50/50 vertical split** (no PiP):

```
Mode 2: YOU top 50%  |  Mode 3: OTHER top 50%
        OTHER bot 50% |          YOU bottom 50%
(UI may overlay edges of tiles; no letterbox clipping)
```

**Mode 4 — letterbox (2 players only):**

```
┌─────────────────────────────┐
│ TOP UI (opaque — no video)  │
├──────────────┬──────────────┤
│     YOU      │    OTHER     │  max 2 feeds, middle band only
├──────────────┴──────────────┤
│ BOTTOM UI (opaque — no video)│
└─────────────────────────────┘
```

Slot order left→right (or top→bottom if stacked): lower slot first. No separate “swap” variant — user said order doesn’t matter for this mode.

---

## 5. Three players (you + 2 others)

`pipOther` = lower-slot remote. The other remote = `others[1]`.

| Index | Layout |
|-------|--------|
| **0** | **you** PiP · stage: both others stacked (1 col, portrait) |
| **1** | **`pipOther`** PiP · stage: **you** + **others[1]** (you + the non-PiP remote) |
| **2** | **you** top 50% · both others bottom 50% side-by-side (2 col) |
| **3** | both others top 50% (2 col) · **you** bottom 50% |
| ~~4~~ | **skipped** |

```
Mode 1 example (3 players):
┌─────────────────────────────┐
│ TOP UI              ┌─────┐ │
│                     │pip  │ │  ← one remote (lowest slot)
│  YOU + other#2      │Other│ │
│  on stage           └─────┘ │
└─────────────────────────────┘
```

---

## 6. Four players (you + 3 others)

| Index | Layout |
|-------|--------|
| **0** | **you** PiP · stage: 3 others → 2-col grid (2 top + 1 bottom row) |
| **1** | **`pipOther`** PiP · stage: **you** + **others[1]** + **others[2]** (2-col grid) |
| **2** | **you** top 50% · 3 others bottom 50% (2-col: 2+1) |
| **3** | 3 others top 50% (2+1) · **you** bottom 50% |
| ~~4~~ | **skipped** |

---

## 7. Five players (you + 4 others)

| Index | Layout |
|-------|--------|
| **0** | **you** PiP · stage: 4 others → 2×2 grid |
| **1** | **`pipOther`** PiP · stage: **you** + 3 remaining others → 2×2 grid |
| **2** | **you** top 50% · 4 others bottom 50% → 2×2 |
| **3** | 4 others top 50% → 2×2 · **you** bottom 50% |
| ~~4~~ | **skipped** |

---

## 8. Six players (you + 5 others) — max game size

| Index | Layout |
|-------|--------|
| **0** | **you** PiP · stage: 5 others → 2 cols × 3 rows |
| **1** | **`pipOther`** PiP · stage: **you** + 4 remaining → 2 cols × 3 rows |
| **2** | **you** top 50% · 5 others bottom 50% → 2×3 grid |
| **3** | 5 others top 50% → 2×3 · **you** bottom 50% |
| ~~4~~ | **skipped** |

**Stage grid helper (portrait, N tiles on stage):**

```typescript
function stageGridColumns(n: number): number {
  if (n <= 2) return 1;   // stack vertically
  return 2;               // 3+ → two columns
}
```

---

## 9. Component structure

```
GameScreen
├── NavBar (Back, title, Logs)
├── CameraLayer (absolute fill, z-index 0)
│   └── IOSCameraGrid
│       props: players, me, localStream, remoteStreams, layoutMode,
│               topUIHeight, bottomUIHeight, onCycleLayout
└── QuizOverlay (absolute fill, z-index 10, pointerEvents="box-none")
    ├── TopUIReserve (onLayout → topUIHeight)
    └── BottomUIReserve (onLayout → bottomUIHeight)
```

**Do not** use web `CameraGrid.tsx` logic. Create `IOSCameraGrid.tsx` implementing this spec.

### 9.1 Core algorithm

```typescript
type LayoutPlan = {
  stage: Player[];
  pip: Player | null;     // NEVER an array — null or exactly one player
  split?: 'horizontal';
  topHalf?: Player[];
  bottomHalf?: Player[];
  letterbox?: boolean;    // mode 4, 2-player only
};

function planLayout(me: Player, players: Player[], layoutMode: number): LayoutPlan {
  const others = players.filter(p => p.id !== me.id).sort((a, b) => a.slot - b.slot);
  const modeCount = layoutModeCount(players.length);
  const mode = ((layoutMode % modeCount) + modeCount) % modeCount;

  if (others.length === 0) {
    return { stage: [me], pip: null };
  }

  const pipOther = others[0];
  const stageWithoutPipOther = [me, ...others.slice(1)]; // mode 1, 3+ players

  switch (mode) {
    case 0:
      return { stage: others, pip: me };

    case 1:
      // 2 players: only [me] on stage. 3+: me + all others except pipOther.
      return {
        stage: others.length === 1 ? [me] : stageWithoutPipOther,
        pip: pipOther,
      };

    case 2:
      return { split: 'horizontal', topHalf: [me], bottomHalf: others, pip: null };

    case 3:
      return { split: 'horizontal', topHalf: others, bottomHalf: [me], pip: null };

    case 4:
      if (players.length !== 2) {
        // Should not happen if cycle skips 4 for 3+; fallback to mode 0.
        return { stage: others, pip: me };
      }
      return {
        letterbox: true,
        stage: [...players].sort((a, b) => a.slot - b.slot),
        pip: null,
      };

    default:
      return { stage: others, pip: me };
  }
}
```

Render branches:

1. **`letterbox`** → exactly **2** tiles in measured middle band; no PiP; UI opaque above/below.
2. **`split`** → two `flex: 1` rows; each half lays out its player list with `stageGridColumns`.
3. **`pip` + `stage`** → stage fills area; **one** PiP `absolute` top-right. Never render a second PiP.

---

## 10. Parity checklist

- [ ] Portrait only; ignore web `sm:` / `lg:` breakpoints
- [ ] PiP top-**right** (iOS), not top-left (web)
- [ ] **Never more than 1 PiP tile**
- [ ] Mode 4 letterbox **only when `players.length === 2`**; skip in cycle for 3–6
- [ ] Mode 4 shows **at most 2 feeds** in middle band
- [ ] Tap any camera tile to cycle; local state only
- [ ] Player order in grids: sort by `slot` unless mode assigns halves
- [ ] Colors from `playerColor(slot)` — copy `lib/player-colors.ts`
- [ ] `cameras_enabled: false` → placeholder, mesh audio-only still works

---

## 11. Files to create / edit (iOS repo)

| File | Action |
|------|--------|
| `src/components/IOSCameraGrid.tsx` | **Create** — layout engine + tiles |
| `src/components/CameraPanel.tsx` | Port tile chrome (border, label, mirror, placeholder) |
| `src/screens/GameScreen.tsx` | `layoutMode` state, stack CameraLayer + QuizOverlay, pass measured heights |
| `src/components/QuestionPanel.tsx` | Split into TopUIReserve + BottomUIReserve with `onLayout` callbacks |

**Web repo reference (behavior only, not layout):** `components/CameraPanel.tsx`, `components/GameScreen.tsx` (layoutMode pattern), `lib/player-colors.ts`.

---

## 12. Mode cycle diagram

**2 players (5 modes):**

```mermaid
stateDiagram-v2
    direction LR
    M0: 0 You PiP
    M1: 1 Other PiP
    M2: 2 You top half
    M3: 3 Other top half
    M4: 4 Letterbox x2

    M0 --> M1 --> M2 --> M3 --> M4 --> M0
```

**3–6 players (4 modes — no letterbox):**

```mermaid
stateDiagram-v2
    direction LR
    M0: 0 You PiP
    M1: 1 One other PiP
    M2: 2 You top half
    M3: 3 Others top half

    M0 --> M1 --> M2 --> M3 --> M0
```

---

*Last updated — single PiP only; letterbox limited to 2-player games and 2 feeds max in middle band.*
