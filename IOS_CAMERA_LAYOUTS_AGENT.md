# WhoSmarter iOS — Camera Layout Modes (complete agent brief)

**Give this entire file to Cursor in the iOS/React Native repo.** It is self-contained — no other repo files are required.

## Task

Implement tap-to-cycle camera layouts on `GameScreen` during play. Portrait iPhone only. Create `IOSCameraGrid.tsx` and wire it from `GameScreen`. Layout state is **local only** (do not sync via Supabase).

The app already has: nav bar (Back · Game · Logs), top quiz UI (timer · question · scores), bottom MC 2×2 or voice controls, orange border frame, floating mic button on the right, WebRTC feeds via `react-native-webrtc`.

---

## Hard rules

1. **At most one PiP.** Never stack PiPs. PiP = one small tile top-**right**, or none.
2. **Letterbox (mode 4) = 2 players only, max 2 feeds** in the middle band between top UI and bottom UI. For 3–6 players, **skip mode 4** when cycling (3 → 0).

---

## Screen layers (fixed UI — never changes)

```
┌─────────────────────────────┐
│ ◀  Game              Logs   │  nav bar
├─────────────────────────────┤
│ TOP UI (opaque in mode 4)   │  timer strip, question box, score pills
├─────────────────────────────┤
│                             │
│   CAMERA (layout modes)     │  + optional single PiP top-right
│                        (🎤) │  floating mic, right edge
├─────────────────────────────┤
│ BOTTOM UI (opaque in mode 4)│  MC 2×2 or voice controls
└─────────────────────────────┘
```

**PiP when used:** `top = safeAreaTop + navBarHeight + 8`, `right = 12`, ~30% width × ~22% height. **One tile max.**

**Camera tile chrome:** colored border by slot, name label bottom-left, mirror local feed (`scaleX: -1`), placeholder initial when cameras off, ✓/✗ on `phase === 'result'`.

---

## Tap interaction

```typescript
const MODES_2P = 5;       // 0..4
const MODES_3P_PLUS = 4;  // 0..3, no letterbox

function layoutModeCount(playerCount: number): number {
  return playerCount === 2 ? MODES_2P : MODES_3P_PLUS;
}

// GameScreen:
const [layoutMode, setLayoutMode] = useState(0);

function cycleLayout() {
  setLayoutMode(m => (m + 1) % layoutModeCount(players.length));
}

// Solo in lobby (no remotes): full-screen self only, disable cycle.
// Tap any visible camera tile (stage or PiP) → cycleLayout().
// Quiz buttons must NOT trigger cycle (separate z-index / pointerEvents).
```

| Players | Cycle |
|---------|--------|
| 2 | 0 → 1 → 2 → 3 → 4 → 0 |
| 3–6 | 0 → 1 → 2 → 3 → 0 |
| 1 (alone) | no cycle |

---

## Mode table (all counts)

`others` = remotes sorted by `slot` ascending.  
`pipOther` = `others[0]` (lowest slot) — the **only** remote ever put in PiP.

| Mode | PiP | Stage / split |
|------|-----|---------------|
| **0** default | **you** | all `others` on stage (grid) |
| **1** | **`pipOther`** only | **you** + all others except `pipOther` on stage (2p: stage = you only) |
| **2** | none | **you** top 50%, all `others` bottom 50% (grid) |
| **3** | none | all `others` top 50% (grid), **you** bottom 50% |
| **4** letterbox | none | **2p only:** you + other, equal, middle band only, no UI on video |

### 2 players (detailed)

| Mode | Layout |
|------|--------|
| 0 | other full · **you** PiP top-right |
| 1 | you full · **other** PiP top-right |
| 2 | you top half · other bottom half |
| 3 | other top half · you bottom half |
| 4 | letterbox: you + other in middle band; top/bottom UI opaque |

```
Mode 0                          Mode 1
┌─────────────────────┐        ┌─────────────────────┐
│ TOP UI      ┌ YOU ┐ │        │ TOP UI    ┌OTHER┐ │
│             └─────┘ │        │           └─────┘ │
│  OTHER (full)       │        │  YOU (full)       │
│ BOTTOM UI           │        │ BOTTOM UI         │
└─────────────────────┘        └─────────────────────┘

Mode 4 (letterbox)
┌─────────────────────┐
│ TOP UI (no video)   │
├──────────┬──────────┤
│   YOU    │  OTHER   │
├──────────┴──────────┤
│ BOTTOM UI (no video)│
└─────────────────────┘
```

### 3 players

| Mode | Layout |
|------|--------|
| 0 | you PiP · 2 others stacked on stage (1 col) |
| 1 | pipOther PiP · you + other#2 on stage |
| 2 | you top 50% · 2 others bottom 50% (2 col) |
| 3 | 2 others top 50% · you bottom 50% |
| 4 | skipped |

### 4 players

| Mode | Layout |
|------|--------|
| 0 | you PiP · 3 others 2-col (2+1) |
| 1 | pipOther PiP · you + 2 others 2-col |
| 2 | you top · 3 others bottom (2+1) |
| 3 | 3 others top · you bottom |
| 4 | skipped |

### 5 players

| Mode | Layout |
|------|--------|
| 0 | you PiP · 4 others 2×2 |
| 1 | pipOther PiP · you + 3 others 2×2 |
| 2 | you top · 4 others bottom 2×2 |
| 3 | 4 others top 2×2 · you bottom |
| 4 | skipped |

### 6 players (max)

| Mode | Layout |
|------|--------|
| 0 | you PiP · 5 others 2×3 |
| 1 | pipOther PiP · you + 4 others 2×3 |
| 2 | you top · 5 others bottom 2×3 |
| 3 | 5 others top 2×3 · you bottom |
| 4 | skipped |

**Portrait stage grid:** if N ≤ 2 tiles → 1 column (stacked); if N ≥ 3 → 2 columns.

---

## Letterbox (mode 4) — measure UI bands

```typescript
const [topUIHeight, setTopUIHeight] = useState(0);
const [bottomUIHeight, setBottomUIHeight] = useState(0);

// TopUIReserve: onLayout → setTopUIHeight
// BottomUIReserve: onLayout → setBottomUIHeight

const cameraBandTop = topUIHeight;
const cameraBandHeight =
  screenHeight - topUIHeight - bottomUIHeight - navBarHeight - homeIndicatorInset;
```

Render exactly **2** feeds inside that band. Sort by slot (lower slot left). No PiP in mode 4.

---

## Types & colors (copy into iOS project)

```typescript
export const MAX_PLAYERS = 6;

export interface Player {
  id: string;
  name: string;
  slot: number;       // 0 = host, 1..5 = guests
  score: number;
  correct: boolean | null;
  // + other fields your app already has
}

export const PLAYER_COLORS = [
  '#2f7d77', // slot 0 / host
  '#e08a3c',
  '#7b68d6',
  '#d65780',
  '#4f9d57',
  '#3b87bd',
] as const;

export function playerColor(slot: number): string {
  const n = PLAYER_COLORS.length;
  return PLAYER_COLORS[((slot % n) + n) % n];
}

export function playerInitial(name: string): string {
  const t = (name ?? '').trim();
  return t ? t[0].toUpperCase() : '?';
}
```

---

## Layout planner (implement as `planLayout.ts` or inside `IOSCameraGrid.tsx`)

```typescript
export type LayoutPlan = {
  stage: Player[];
  pip: Player | null;
  split?: 'horizontal';
  topHalf?: Player[];
  bottomHalf?: Player[];
  letterbox?: boolean;
};

export function layoutModeCount(playerCount: number): number {
  return playerCount === 2 ? 5 : 4;
}

export function stageGridColumns(n: number): number {
  if (n <= 2) return 1;
  return 2;
}

export function planLayout(
  me: Player,
  players: Player[],
  layoutMode: number,
): LayoutPlan {
  const others = players
    .filter(p => p.id !== me.id)
    .sort((a, b) => a.slot - b.slot);
  const modeCount = layoutModeCount(players.length);
  const mode = ((layoutMode % modeCount) + modeCount) % modeCount;

  if (others.length === 0) {
    return { stage: [me], pip: null };
  }

  const pipOther = others[0];
  const stageWithoutPipOther = [me, ...others.slice(1)];

  switch (mode) {
    case 0:
      return { stage: others, pip: me };
    case 1:
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

---

## Component structure

```
GameScreen
├── NavBar
├── CameraLayer (absolute inset 0, zIndex 0)
│   └── IOSCameraGrid
│         players, me, localStream, remoteStreams, layoutMode,
│         topUIHeight, bottomUIHeight, onCycleLayout, camerasEnabled, phase
└── QuizOverlay (absolute inset 0, zIndex 10, pointerEvents="box-none")
    ├── TopUIReserve (onLayout → topUIHeight) — timer, question, scores
    └── BottomUIReserve (onLayout → bottomUIHeight) — MC or voice
```

### IOSCameraGrid render logic

1. `const plan = planLayout(me, players, layoutMode)`
2. If `plan.letterbox` → clip to middle band; render 2 equal tiles from `plan.stage`; no PiP
3. If `plan.split` → two rows flex 1; grid each half with `stageGridColumns`
4. Else → grid `plan.stage` full area; if `plan.pip` → one absolute PiP top-right
5. Each tile: `Pressable` wrapping `RTCView` + labels; `onPress={onCycleLayout}`
6. Stream: local if `p.id === me.id`, else `remoteStreams[p.id]`

### GameScreen additions

```typescript
const [layoutMode, setLayoutMode] = useState(0);
const [topUIHeight, setTopUIHeight] = useState(0);
const [bottomUIHeight, setBottomUIHeight] = useState(0);

const canCycleLayout = players.filter(p => p.id !== me.id).length > 0;
const onCycleLayout = canCycleLayout
  ? () => setLayoutMode(m => (m + 1) % layoutModeCount(players.length))
  : undefined;

// Clamp when player count changes:
useEffect(() => {
  setLayoutMode(m => m % layoutModeCount(players.length));
}, [players.length]);
```

---

## Checklist

- [ ] Portrait only — no landscape layouts
- [ ] PiP top-right, never more than 1 PiP
- [ ] Mode 4 only for 2-player games; max 2 feeds in middle band
- [ ] Tap camera tile cycles layout; quiz controls do not
- [ ] `layoutMode` local state only
- [ ] Grid sort by `slot` where applicable
- [ ] `playerColor(slot)` on borders and labels
- [ ] Placeholder avatar when `cameras_enabled === false`

---

## Files to create / edit

| File | Action |
|------|--------|
| `src/components/IOSCameraGrid.tsx` | Create — planner + render |
| `src/lib/planLayout.ts` | Create (optional) — export functions above |
| `src/lib/player-colors.ts` | Ensure colors match table above |
| `src/screens/GameScreen.tsx` | Add layoutMode, UI height measurement, IOSCameraGrid layer |
| `src/components/QuestionPanel.tsx` | Expose TopUIReserve + BottomUIReserve with onLayout |

**Do not** copy web CameraGrid (web uses top-left PiP and 3 modes — different product).

---

## Prompt to paste in other Cursor window

```
Implement camera layout modes per the attached IOS_CAMERA_LAYOUTS_AGENT.md spec.
Create IOSCameraGrid.tsx, wire layoutMode + onLayout UI heights in GameScreen,
portrait iPhone only, max 1 PiP top-right, letterbox mode 4 for 2-player only.
Use the planLayout() code from the spec verbatim.
```

Attach or paste **this entire file** as context.
