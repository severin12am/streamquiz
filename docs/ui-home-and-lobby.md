# WhoSmarter — Home & Lobby UI Specification

Detailed description of the **initial (home) screen** and **lobby / pre-quiz screens**.  
Does **not** cover in-quiz layout (camera grid, question panel, timer, buzz, winner overlay, etc.).

---

## Global design system (shared by both screens)

**Theme:** Light “lagoon” palette — soft sage off-white background (`#eef3ec`), white cards, lagoon teal accent (`#2f7d77`), warm gold for host badges (`#c8922f`), coral red for errors (`#d65745`).

**Typography:** Geist Sans (body), Geist Mono (share links). Primary text `#1d2b27`, secondary `#50605a`, muted labels `#84938a`.

**Design language:** Mechanical **keycap** aesthetic — raised 3D buttons with press-down animation, recessed input wells inside gray bezels, toggles with domed thumbs, cards with 16px radius and soft elevation shadow.

**Layout pattern:** Vertically centered single-column content, `max-w-md` (~448px) for main cards, full viewport height on game routes, scrollable on home if content is tall.

**Fixed overlay (home + lobby):** `SoundToggle` — circular secondary keycap (36–40px), top-right with safe-area insets, mute/unmute icon. Present on `CreateGame` and lobby; not on the home header block itself.

**Source files:** `app/globals.css`, `app/layout.tsx`

---

## Screen 1: Home / initial screen (`/`)

**Route:** `app/page.tsx`  
**Purpose:** Host lands here to create a quiz. Guests typically join via `/game/[id]` and never see this page.

### Page shell

| Layer | Description |
|--------|-------------|
| **Background** | Full-viewport base color + `HomeDotTexture`: procedurally generated repeating SVG dot pattern (720 teal dots per 220×220 tile, random sizes/opacities). Client-only to avoid hydration mismatch. `pointer-events-none`, behind content (`z-0`). |
| **Main container** | `min-h-dvh`, flex column, centered horizontally and vertically, padding `px-4 sm:px-6`, `py-8 sm:py-12`. Content stack at `z-10`. |

Vertical order (top → bottom):

---

### Panel A: Setup banner (conditional)

**Component:** `components/SetupBanner.tsx`  
**Visible when:** Supabase env vars are missing (`isMisconfigured`).

| Property | Detail |
|----------|--------|
| **Container** | `.card` — white, 1px border, 16px radius. Gold border override. Full width, `max-w-md`, `mb-8`, padding `p-5`. |
| **Title** | Gold, semibold, base size — “Setup required before you can play”. |
| **Body** | Numbered list (5 steps): copy `.env.local`, Supabase keys (linked), OpenAI key (linked), run `supabase/schema.sql` (inline code chip), restart dev server. Secondary text; links gold + underline. |

If configured correctly, this panel does not render.

---

### Panel B: Home header

**Component:** `components/HomeHeader.tsx`  
**Width:** `max-w-md`, centered, `mb-10`.

#### B1 — Language switcher row

- Right-aligned (`flex justify-end mb-4`).
- **Button:** Secondary keycap, rounded-xl, globe icon (teal) + current language label.
- **Dropdown (open):** Elevated card below button, end-aligned, `z-50`, min-width ~10.5rem. Seven locales with dot indicator; selected row has teal tint. Closes on outside click or Escape.

**Locales:** English, Russian, Español, Français, Deutsch, 日本語, العربية.

#### B2 — Logo / title

- **H1:** `text-4xl sm:text-5xl`, bold, tight tracking.
- Text: `Who` + **interactive “S” keycap** + `marter`.
- The **S** is an inline primary keycap (`keycap-logo`). Click triggers 420ms bounce/rotate animation (`is-pop`). Accessible label: “Tap the S”.

#### B3 — Three-step hint strip

- Below title, `mt-6`.
- Muted small text, centered.
- Steps: “Create a custom quiz” · “Invite your friends” · “Play”.
- On `sm+`, dash dividers between steps; on mobile, stacked/wrapped.

---

### Panel C: Create game form

**Component:** `components/CreateGame.tsx`  
**Wrapper:** `relative w-full max-w-md` + fixed `SoundToggle` (top-right).

**Main card:** `.card.elevated`, flex column, `gap-6`, padding `p-5 sm:p-7`.

#### C1 — Topic input

| Element | Detail |
|---------|--------|
| **Label** | Uppercase, xs, semibold, muted, tracking-wider — “Topic”. |
| **Input frame** | `keycap-input-frame` — gray raised bezel. |
| **Input** | Recessed well, full width, rounded-xl, `px-4 py-3`, base text. Placeholder: “e.g. 90s Cartoons, Science, Football”. Max 100 chars. **Autofocus** on load. |

#### C2 — Error banner (conditional)

- Renders on validation/API failure only.
- Rounded-xl: light red background, red border, red text, sm size.
- Triggers: empty topic, question generation failure, DB failure, generic error.

#### C3 — Primary submit button

- Full-width primary keycap, `py-3.5`, semibold, white text.
- **Default:** “Create challenge”.
- **Loading:** Disabled; spinner + “Generating questions”.
- **On success:** Redirects to `/game/[id]?role=host` (lobby). No separate share step on home.

**Backend flow on submit:**

1. POST `/api/generate-questions` (OpenAI).
2. Insert row in Supabase `games` table (`status: waiting`, `phase: waiting`).
3. Navigate host to lobby.

#### C4 — Adjust settings toggle

- Secondary keycap, full width, `text-sm`.
- **Collapsed:** “Adjust”.
- **Expanded:** “Hide settings”.
- `aria-expanded` + `aria-controls="create-adjust-panel"`.

#### C5 — Collapsible adjust panel

**Container:** `#create-adjust-panel` — CSS `max-height` animation + inner fade/slide. Collapsed: `inert`, `aria-hidden`.

When open (`gap-6` inner stack):

| Section | UI | Default |
|---------|-----|---------|
| **Difficulty** | Label + 3 equal keycap buttons: Easy / Medium / Hard. Selected = primary teal. | Medium |
| **Number of questions** | `KeycapSegSlider`: track, tick markers, teal fill, pill handle with number. Range 3–20. | 5 |
| **Game mode** | Two buttons (stacked mobile, row on sm+): “Every answer counts” / “Only first answer counts”. Hint below. | regular |
| **Multiple choice** | Title + hint left; toggle right. | ON |
| **Player cameras** | Title + hint left; toggle right. | ON |

**Toggle styling:** Gray well off; teal well on; domed white thumb slides right.

---

### Home screen responsive behavior

- Page scrolls vertically on short phones.
- Title scales 4xl → 5xl at `sm`.
- Game mode buttons stack on mobile, row on `sm+`.
- Mobile: larger touch targets for toggles, compact keycaps, slider handle.

---

## Screen 2: Game route — pre-lobby states (`/game/[id]`)

From `components/GameScreen.tsx` before lobby or quiz. Still not quiz layout.

### State A: Loading

- Full viewport (`h-dvh`), centered.
- **Spinner:** 40px circle, gray border, teal top segment.
- **Text:** “Joining game”.
- No card, no sound toggle.

### State B: Error / game not found

- Centered elevated card, `max-w-md`, `px-8 py-10`.
- **Title:** “Game not found” (or error string).
- **Hint:** Check link or create new game.
- **Action:** Primary keycap link “Back to home” → `/`.

---

## Screen 3: Lobby (`/game/[id]` when `game.status === 'waiting'`)

**Component:** `components/Lobby.tsx`  
**Wrapper:** `GameScreen` adds fixed `SoundToggle`.

**Purpose:** Unified waiting room — player list, invite (host), name entry OR start/waiting.

### Page shell

- `min-h-dvh`, flex center, `p-4 sm:p-6`.
- Plain `--bg-base` background (no dot texture).
- Single elevated card: `max-w-md`, `gap-5`, `p-5 sm:p-7`.

---

### Panel L1 — Lobby header

| Element | Detail |
|---------|--------|
| **Title** | “Lobby” — 2xl, bold, centered. |
| **Subtitle** | “{n} / 6 players” — sm, secondary, centered. |

---

### Panel L2 — Player slot list (always 6 rows)

**Filled seats** (one row per joined player):

| Part | Detail |
|------|--------|
| **Row** | `keycap-well-frame` → `keycap-well`, flex, `px-4 py-2.5`, gap-3. |
| **Avatar** | 28×28 circle, slot color, white initial. |
| **Name** | Sm, medium, truncated. |
| **Badges** | Host: gold “Host”. Self: muted “(you)”. |
| **Highlight** | Current user row: inset `ring-1 ring-[var(--accent)]`. |

**Slot colors** (`lib/player-colors.ts`):

| Slot | Color | Role |
|------|-------|------|
| 0 | `#2f7d77` lagoon teal | Host (accent) |
| 1 | `#e08a3c` amber | Guest |
| 2 | `#7b68d6` violet | Guest |
| 3 | `#d65780` rose | Guest |
| 4 | `#4f9d57` green | Guest |
| 5 | `#3b87bd` blue | Guest |

**Empty seats** (remaining up to 6):

- 50% opacity.
- Dashed border on well.
- Gray circle with seat number (1-based).
- Em dash “—” for name.

Order: joined players first, then empty placeholders.

---

### Panel L3 — Invite block (host only)

When `isHost` (seated host OR `?role=host` before claiming seat).

| Element | Detail |
|---------|--------|
| **Label** | Uppercase xs, muted, centered — invite up to 6 total. |
| **QR code** | White pad, `rounded-2xl`, 132×132. Encodes `{origin}/game/{id}` (no `?role=host`). |
| **Link row** | Monospace truncated URL + Copy compact keycap. Copy → green “Copied” 1.5s + click sound. |

Guests do not see QR or link.

---

### Panel L4 — Action area (state-dependent)

#### L4a — Not seated, room available

- Name input (centered, max 24 chars, autofocus, localStorage prefill).
- Name error if empty submit.
- Full-width “Join” / “Joining…” primary keycap.

#### L4b — Not seated, game full

- Well with red message: full (6 players). No input or button.

#### L4c — Seated, host

- “Start quiz” full-width primary keycap.
- Disabled until ≥2 players.
- When disabled: “Waiting for at least one more player…”

#### L4d — Seated, guest

- Spinner + “Waiting for the host to start…”
- No button.

---

### Typical host flow

1. Create on home → `/game/[id]?role=host`, not in list yet.
2. Empty slots + QR/link + name form.
3. Enter name → slot 0, Host badge, Start disabled until guest joins.
4. Guest opens share link → lobby with name form only.
5. Host starts at 2+ players → quiz begins (out of scope).

---

## Screen 4: Late-join (pre-quiz edge case)

**Component:** `components/JoinScreen.tsx`  
**When:** Game already started but browser has no seat. Not the lobby.

| Property | Detail |
|----------|--------|
| **Shell** | Centered, `max-w-sm`, fixed `SoundToggle`. |
| **Header** | “Join the quiz” or “You are the host” + name subtitle. |
| **Body** | Name input + Join, or full-game message. |
| **Missing vs lobby** | No player list, QR, start, or player count. |

---

## Visual hierarchy

```text
HOME (/)
├── [optional] Setup banner (gold warning card)
├── Header
│   ├── Language switcher
│   ├── Who[S]marter logo
│   └── Create → Share → Play hints
└── Create card
    ├── Topic input
    ├── [error]
    ├── Create challenge (primary)
    ├── Adjust / Hide settings (secondary)
    └── [collapsible] Difficulty | Questions | Mode | MC | Cameras
    └── SoundToggle (fixed corner)

LOBBY (/game/id, waiting)
├── SoundToggle (fixed corner)
└── Lobby card
    ├── Title + player count
    ├── 6 slot rows (filled + empty)
    ├── [host only] QR + link + Copy
    └── Join | Full msg | Start quiz | Waiting spinner
```

---

## Component / file map

| Screen / panel | File |
|----------------|------|
| Home page shell | `app/page.tsx` |
| Dot background | `components/HomeDotTexture.tsx` |
| Setup banner | `components/SetupBanner.tsx` |
| Logo + language + steps | `components/HomeHeader.tsx` |
| Create form | `components/CreateGame.tsx` |
| Question count slider | `components/KeycapSegSlider.tsx` |
| Language menu | `components/LanguageSwitcher.tsx` |
| Sound mute | `components/SoundToggle.tsx` |
| Lobby | `components/Lobby.tsx` |
| Late join | `components/JoinScreen.tsx` |
| Loading / error / lobby routing | `components/GameScreen.tsx` (waiting branch) |
| Global styles | `app/globals.css` |
| UI strings | `lib/i18n/messages.ts` |

---

## Interaction notes

- Keycap actions play `click` sound unless muted (`lib/sounds.ts`).
- Player name saved to localStorage (`lib/client-id.ts`).
- All strings via `useLocale()` / `lib/i18n`.
- Home: dot texture. Lobby: flat sage — visual shift from create to waiting room.

---

## Explicitly out of scope

- `CameraGrid`, `CameraPanel`, `QuestionPanel`, `MCOptions`
- `PlayerStatusBar`, `BuzzButton`, `CountdownTimer` during play
- `WinnerScreen`, in-game `ScoreBoard`
- WebRTC / mesh layout during quiz
