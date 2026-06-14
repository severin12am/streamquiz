# WhoSmarter — Design System

This document describes the visual and interaction design of **WhoSmarter**: a light, calm “lagoon” theme with a **tactile mechanical-keycap** interaction layer. The goal is matte, physical controls — raised depth, inset shadows, and a deliberate press animation — not glossy or neon UI.

**Source of truth:** `app/globals.css` (tokens + component CSS) and the React components that apply the class names listed below.

---

## Design philosophy

| Principle | Meaning |
|-----------|---------|
| **Physical, not flat** | Interactive elements look like keycaps with visible side walls and travel distance when pressed |
| **Matte surfaces** | Gradients are subtle top-to-bottom shading, not glossy reflections |
| **One dominant accent** | Lagoon teal drives primary actions; sage green tints backgrounds |
| **Snappy but visible press** | Press/release uses a spring curve over ~340ms so the motion is felt, not instant |
| **Consistent depth language** | Raised = interactive · Recessed = input/display · Locked = pressed flush |

---

## Color palette

Defined in `:root` in `app/globals.css`. Always **light mode** (no dark-mode toggle).

### Surfaces

| Token | Hex | Use |
|-------|-----|-----|
| `--bg-base` | `#eef3ec` | App background (sage-tinted off-white) |
| `--bg-panel` | `#e4ece0` | Large panels (camera column, question top bar) |
| `--bg-card` | `#ffffff` | Cards |
| `--bg-elevated` | `#dde7d6` | Hover states, disabled keycap fallback |
| `--border` | `#d3decb` | Default hairline border |
| `--border-strong` | `#bccfb1` | Emphasised border |

### Semantic colors

| Token | Hex | Use |
|-------|-----|-----|
| `--accent` | `#2f7d77` | Primary brand, main actions |
| `--accent-hover` | `#276964` | Primary hover |
| `--secondary` | `#9cc081` | Soft sage (background tinting) |
| `--correct` | `#2f9e6f` | Correct answers, mic-on |
| `--wrong` / `--buzz-red` | `#d65745` | Wrong answers, buzz button |
| `--gold` | `#c8922f` | Winner, host badge |

### Text

| Token | Hex |
|-------|-----|
| `--text-primary` | `#1d2b27` |
| `--text-secondary` | `#50605a` |
| `--text-muted` | `#84938a` |

### Timer ring (CountdownTimer)

`--timer-ok` → `--timer-warning` → `--timer-urgent` (green → amber → red).

### Typography

- **Font:** Geist Sans (`--font-geist-sans`), fallback Inter / Arial
- Antialiased, optimized legibility

---

## Base layout utilities

| Class | Purpose |
|-------|---------|
| `.card` | White surface, 16px radius, subtle border |
| `.elevated` | Soft drop shadow for modals and forms |

Viewport: home/join/lobby use **`min-h-dvh`** and scroll normally. The in-game view locks to **`h-dvh`** with internal scroll regions.

---

## Keycap buttons

Base class: **`.keycap`** + a color variant.

### Anatomy

Each keycap simulates a physical key:

```
┌─────────────────┐  ← face (gradient top → bottom)
│                 │
└─────────────────┘
 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ← 3 “wall” layers (stacked box-shadows)
 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ← stem + ambient shadow
```

- **Resting:** raised by `--keycap-travel` (default 5px; 4px on mobile)
- **Hover:** slightly lighter face gradient
- **Active (`:active`):** translates down by travel distance; walls collapse; deep inset shadow
- **Disabled:** flat gray, no depth, 65% opacity

### Timing (tunable in `.keycap`)

| Variable | Default | Applies to |
|----------|---------|------------|
| `--keycap-press-duration` | `340ms` | transform, box-shadow, text-shadow |
| `--keycap-color-duration` | `480ms` | background, color |

Easing: `cubic-bezier(0.32, 1.45, 0.58, 1)` (slight spring).

### Color variants

| Class | Travel | Face | Used for |
|-------|--------|------|------------|
| `.keycap-primary` | 5px | Lagoon teal gradient | Create, Join, Start, Done, Rematch, Back home |
| `.keycap-secondary` | 5px | White/gray neutral | Adjust, Exit, copy, unselected MC options, PTT idle |
| `.keycap-danger` | 6px | Red gradient | Buzz button (legacy) |
| `.keycap-success` | 4px | Green gradient | Push-to-talk mic active |

### Size and special modifiers

| Class | Purpose |
|-------|---------|
| `.keycap-compact` | Smaller copy/toolbar buttons (min 44px tall on mobile) |
| `.keycap-inline` + `.keycap-logo` | Inline “S” in **WhoSmarter** title |
| `.keycap-revealed` | Locked in pressed position (no hover/click) |
| `.keycap-revealed-correct` | Green-tinted pressed face (MC reveal) |
| `.keycap-revealed-wrong` | Red-tinted pressed face |
| `.keycap-revealed-neutral` | Gray pressed face |

Links styled as keycaps: `a.keycap` removes underline and uses inline-flex.

### Usage

```html
<button class="keycap keycap-primary py-3.5 rounded-xl font-semibold text-white">
  Create challenge
</button>
```

---

## Recessed controls — wells and inputs

Two-part structure: raised bezel + sunken tray.

| Class | Role |
|-------|------|
| `.keycap-input-frame` / `.keycap-well-frame` | Raised gray bezel (2px padding, outer shadow) |
| `.keycap-input` | Editable text field inside the frame |
| `.keycap-well` | Read-only recessed display (transcripts, lists, share URLs) |

Focus on inputs: teal ring on the frame via `:focus-within`.

---

## Toggle switches

Classes: **`.toggle`**, **`.toggle-well`**, **`.toggle-thumb`**

- Outer bezel: raised gray frame
- Track well: dark inset groove when OFF; teal inset when ON (`aria-checked="true"`)
- Thumb: domed white circle with highlight dot; slides 26px (28px on mobile)
- Active press: thumb dips 1px and compresses slightly

Used for: Multiple Choice mode, Cameras enabled (create form).

---

## Segmented slider (`KeycapSegSlider`)

Custom pointer-drag control for **question count (3–10)**. No native `<input type="range">`.

```
  | | | | | | | |     ← snap tick marks
  ████████░░░░░░      ← teal fill stops at handle left edge
        [ 5 ]         ← pill handle with bold number
```

CSS classes: `.seg-slider`, `.seg-slider-rail`, `.seg-slider-fill`, `.seg-slider-handle`, `.seg-slider-marker`.

- Snaps to integers; keyboard arrows supported
- Handle uses keycap-style press on drag
- Mobile: 44px rail height for touch

Component: `components/KeycapSegSlider.tsx`

---

## Chips and menu items

| Class | Purpose |
|-------|---------|
| `.keycap-chip` / `.keycap-chip-inner` | Raised score chips in live leaderboard |
| `.keycap-chip-inner.is-me` | Teal-tinted inner well for local player |
| `.keycap-menu-item` | Language dropdown rows (recessed hover, teal selected state) |

---

## Home page dot texture

Component: `components/HomeDotTexture.tsx` (home page only)

- ~720 random teal dots per 220×220px tile, tiled across the viewport
- Dot sizes mostly 0.2–0.9px radius; opacity 8–28%
- Generated **client-only** in `useEffect` to avoid hydration mismatch
- Layer sits inside `<main>` as `absolute inset-0 z-0`; content is `relative z-10`

---

## Motion and animation

| Animation | Where | Behavior |
|-----------|-------|----------|
| Keycap press/release | All `.keycap` | 340ms travel + shadow (see above) |
| `logo-s-tap` | Home “S” button | Press → bounce → slight rotate (~420ms) |
| `adjust-panel` | Create “Adjust” settings | Height expand + fade/slide (~300ms); pre-measured height |
| `speaking-pulse` | Camera tiles | Soft teal ring when someone is speaking |
| `buzz-flash` | Buzz button | Quick opacity blink ×2 |
| `timer-drain` | Countdown ring | SVG stroke animation |
| `prefers-reduced-motion` | Adjust panel | Instant show/hide, no transition |

---

## Screen-by-screen application

### Home / Create (`app/page.tsx`, `CreateGame`, `HomeHeader`)

- Dot texture background
- Logo “S” — inline primary keycap with pop animation
- Topic — `keycap-input-frame` + `keycap-input`
- Create / Enter quiz — `keycap-primary`
- Adjust toggle — `keycap-secondary`; animated panel
- Inside adjust: difficulty + game mode pill keycaps, toggles, `KeycapSegSlider`
- Share link bar — `keycap-well` + compact copy keycap
- Language switcher — secondary keycap + tactile menu

### Join / Lobby

- Name input — recessed keycap input
- Join / Start — primary keycap
- Player rows, share URLs — `keycap-well`
- Copy — `keycap-compact`

### In-game (`GameScreen`, `QuestionPanel`, `MCOptions`, `ScoreBoard`)

- Mobile: camera **34vh**, question panel scrolls; **`h-dvh`** viewport
- Scoreboard — horizontal scroll on mobile; `keycap-chip` per player
- MC options — 1 column on narrow screens, 2 from `sm`; reveal uses `keycap-revealed` tints
- Voice answer — transcript well + type input + Done primary keycap
- PTT — fixed with safe-area insets; icon-only below 400px width; hidden when game ends
- Result cards — recessed wells with player color stripe

### Winner (`WinnerScreen`)

- Final scores — recessed wells
- Clip downloads — full-width secondary keycaps (links)
- Rematch / Exit — stacked full-width on mobile

### Error state

- “Back home” — primary keycap link

---

## Mobile guidelines

Applied via Tailwind breakpoints and `@media (max-width: 639px)` in `globals.css`.

| Area | Behavior |
|------|----------|
| Viewport | `dvh` instead of `vh` for browser chrome |
| Touch targets | Copy, toggles, slider rail ≥ ~44px on mobile |
| MC grid | Single column below `sm` |
| PTT | Safe-area insets; extra `pb-24` on question scroll area |
| Scoreboard | Horizontal scroll instead of multi-row wrap |
| Home steps | Stack vertically on narrow screens |
| Keycap travel | Reduced to 4px on mobile to avoid shadow clipping |

---

## Intentionally plain UI

Not given keycap treatment (display or specialty):

- Camera grid / video tiles (speaking pulse only)
- Countdown timer SVG ring
- Setup banner doc links
- Winner overlay frosted scrim
- Player avatar circles
- Question text and status copy

---

## Architecture

```
app/globals.css              ← tokens + all tactile CSS
components/KeycapSegSlider.tsx
components/HomeDotTexture.tsx
components/*.tsx             ← apply class names; minimal inline styling
docs/DESIGN.md               ← this file
```

### Adding new UI

| Need | Pattern |
|------|---------|
| Primary action | `class="keycap keycap-primary rounded-xl …"` |
| Secondary action | `class="keycap keycap-secondary …"` |
| Text input | wrap in `keycap-input-frame`, class `keycap-input` on field |
| Read-only panel | `keycap-well-frame` → `keycap-well` |
| On/off setting | `toggle` + `toggle-well` + `toggle-thumb` |
| Integer picker | `KeycapSegSlider` |
| Retheme | edit `:root` variables and/or `--keycap-*` custom properties |

---

## Depth hierarchy (summary)

```
Raised (interactive)     keycap-primary / secondary / success / danger
Recessed (input/display) keycap-input / keycap-well
Locked (post-action)     keycap-revealed (+ correct / wrong / neutral)
Settings                 toggle, seg-slider
```

Teal keys mean “go.” Gray keys mean “options.” Sunken trays hold text. Locked keys show revealed answers.
