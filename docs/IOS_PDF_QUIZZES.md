# PDF-Sourced Quizzes — Native (iOS) Parity Spec

**Audience:** Cursor agent / developer editing the **React Native iOS** WhoSmarter app.  
**Goal:** Match web behavior for creating and rematching quizzes that are grounded in an uploaded PDF, against the **same deployed API + Supabase**.

**Status:** **Web shipped** (create + rematch + page/char caps). Native must implement the same product flow and wire the same API fields.

**Out of scope for this doc:** How to pick libraries, native file-picker APIs, or sample code. This document describes **what** happens, **why**, and **what must be true** for parity — not **how** to code it on RN.

**Also out of scope:** Geography quizzes and IQ testing. PDF mode is mutually exclusive with Geography on web.

General iOS setup (API base URL, `X-WhoSmarter-Client: ios`, quota headers): see `ios_implementation_help.md` in the web repo.

---

## Related web references (source of truth)

| Area | Where on web |
|------|----------------|
| Create UI + mutual exclusivity | Create-game form → “Specific types of quiz” → PDF |
| Client extraction + page/char caps | PDF source helpers + client extract step before create |
| Create API | `POST /api/create-game` with `source_text` |
| Rematch API | `POST /api/generate-questions` with `game_id` (loads stored text server-side) |
| DB | `games.source_text` (nullable, immutable after create) — migration v19 |
| Topic encoding | Topic stored as `PDF: {filename}` |
| Model prompts | Document-grounded prompt path (no difficulty guide; language from document) |

---

## 1. Product idea (one sentence)

The host picks a PDF instead of typing a topic; the quiz is generated **only from that document’s text**, and topic + difficulty controls are turned off for that create.

---

## 2. Where it lives in the create UI

Under **More → Specific types of quiz**, web has three slots:

1. **Geography** (separate flow; clears PDF if chosen)
2. **IQ testing** (disabled / coming soon)
3. **PDF** (active)

PDF entry points on web:

- Tap PDF → system file picker (PDF only)
- Drag-and-drop a PDF onto the PDF control

While a PDF is being read, the control shows a busy state (“Reading…”). Failures surface as a normal create-form error (empty PDF, not a PDF, too large, not enough extractable text, etc.).

---

## 3. Mutual exclusivity and inactive fields

PDF mode and Geography mode **cannot** both be active.

When a PDF has been accepted:

| Control | Behavior |
|---------|----------|
| **Topic** | Inactive. Replaced by a “PDF quiz” summary showing the file name (and a page truncation note if applicable). Clear removes the PDF and restores the normal topic field. |
| **Difficulty** | Inactive / hidden (same idea as Geography). Server still stores a valid difficulty value (`medium`) because the DB requires one. |
| **Geography** | Cleared if it was set. Choosing Geography later clears the PDF. |
| Other settings | Still apply: number of questions, game mode, answer time (regular), MC, cameras, invite-only. |

Validation on create:

- Normal topic quizzes still require a non-empty topic.
- PDF quizzes require a successfully extracted PDF (topic text is not required).
- Geography rules unchanged when Geography is active instead.

---

## 4. End-to-end create flow

```
Host selects PDF
    → Client validates file (type, size, non-empty)
    → Client extracts text from the FIRST N pages only (see §5)
    → Client applies a character cap (see §5)
    → UI shows PDF active; topic + difficulty off
Host taps Create
    → Same auth / quota rules as any other create
    → POST /api/create-game with:
         topic:          "PDF: {original filename}" (trimmed/capped length)
         difficulty:     "medium" (placeholder; ignored for generation)
         source_text:    extracted + capped document text
         + usual fields (num_questions, mc_mode, game_mode, answer_seconds, …)
    → Server validates source_text, generates questions grounded ONLY in that text
    → Server inserts game row including source_text (for rematch later)
    → Host lands in lobby as usual
```

Important product rules for generation:

- Questions and answers must come **only** from the provided source text — not general knowledge about the filename or topic label.
- Quiz language follows the **document language**, not the UI locale (same spirit as topic-language quizzes).
- Difficulty guide is **not** used for PDF quizzes; tone is “fair quiz for someone who read this excerpt.”
- The stored **topic** is a label for the room (`PDF: My Notes.pdf`), not the content the model should invent from.

---

## 5. Limits (must match web — model safety)

These exist so a 500-page PDF cannot blow the LLM context window or burn cost/latency.

| Limit | Value | Purpose |
|-------|--------|---------|
| Max file size | **20 MB** | Reject oversized uploads before parsing |
| Max pages used | **First 30 pages** | Only pages 1…30 are extracted; the rest are ignored |
| Max source characters | **40 000** | Hard cap after page extraction (~safe headroom for Grok / gpt-4o with prompt + JSON output) |
| Min usable text | Roughly **40+** characters of real text | Reject empty / image-only / failed OCR-less scans |

### Page truncation behavior

- If the PDF has ≤ 30 pages → use all pages (then still apply the character cap if needed).
- If the PDF has > 30 pages → use **only the first 30**.
- UI should tell the host clearly, e.g. “Using first 30 of 500 pages.”
- The source text sent to the API may also include a short machine-readable note that the quiz uses the first N of M pages (web appends this when truncated by pages).

### Character truncation behavior

- After page extraction, if text is still longer than 40 000 characters, truncate and mark that the document was truncated for quiz generation.
- Character truncation can happen even inside 30 pages (very dense PDFs).

### What we do **not** do

- We do **not** upload the raw PDF binary to the create API.
- We do **not** send all 500 pages of text.
- We do **not** rely on the server to re-parse the PDF at create time (web extracts on the client, then sends `source_text`).
- We do **not** run OCR for scanned image PDFs on web; if there isn’t enough extractable text, create fails with a clear error. Match that expectation unless product later adds OCR.

---

## 6. API contract (create)

**Endpoint:** `POST /api/create-game`  
Same auth / iOS client headers / quota behavior as other creates.

**PDF-specific body fields:**

| Field | Required for PDF? | Meaning |
|-------|-------------------|---------|
| `source_text` | **Yes** | Extracted document text (already page- and char-capped) |
| `topic` | Yes (as label) | Prefer `PDF: {filename}`; server normalizes / re-encodes if needed |
| `difficulty` | Yes (DB) | Send `medium`; ignored for generation when `source_text` is present |
| `geography` | No | Must **not** be sent together with a real PDF source; PDF wins if both somehow appear |

All other create fields behave as today (`num_questions`, `mc_mode`, `game_mode`, `answer_seconds`, `cameras_enabled`, `is_public`, `previous_questions`, locale if you send it, etc.).

**Server outcomes:**

- Validates `source_text` (type, minimum length, max length).
- Stores `games.topic` as a `PDF: …` label.
- Stores `games.difficulty` as `medium`.
- Stores full accepted `source_text` on `games.source_text` (immutable).
- Returns `{ gameId, questions, … }` like any other create.

**Prerequisite:** Supabase migration **v19** (`source_text` column) must be applied in the shared backend. Without it, PDF create/rematch cannot work.

---

## 7. Rematch flow (do not replay the same questions by default)

PDF source text is **not** needed in day-to-day client game state. Web strips it from the client game object so realtime payloads stay smaller and the full document isn’t kept in memory on every player device.

Rematch for a PDF game:

```
Host rematch vote succeeds (same rules as today)
    → Detect PDF game via topic prefix "PDF:"
    → POST /api/generate-questions with normal rematch fields
         PLUS game_id: <this game's id>
    → Do NOT rely on re-sending source_text from the client
    → Server loads games.source_text for that game_id
    → Server regenerates a NEW question set from that stored text
    → Client applies the usual “avoid previous questions” memory when possible
    → Lobby resets with the new questions
```

### Fallback behavior (must match web)

| Situation | Behavior |
|-----------|----------|
| Quota exhausted (`402`) | Replay the **same** questions; show quota messaging if you already do for rematch |
| PDF source missing / unavailable (`409` or failed generate) | Fall back to replaying the **same** questions (graceful), same as other rematch failures |
| Generate succeeds | Prefer **new** questions; avoid repeating ones already seen in the session when filtering allows |

**Do not** regenerate a PDF quiz using only the topic string `PDF: filename.pdf` without `source_text` / `game_id` — that would invent trivia about the filename, not the document.

---

## 8. In-game / display details

- Topic pill / lobby topic: show a human-friendly label (filename), not necessarily the raw `PDF:` prefix if you already have a display helper pattern (web shows the filename part).
- Gameplay itself is unchanged: same phases, MC/voice, scoring, cameras.
- Public browse list may show the `PDF: …` topic string — acceptable.
- Guests joining a PDF room do **not** need the PDF file or source text; they only play the generated questions.

---

## 9. Auth, quota, privacy notes

- Creating a PDF quiz costs the same create quota as any AI-generated quiz.
- Rematch that regenerates questions also consumes create quota (same as topic rematch).
- `source_text` is stored on the game row for rematch. Treat it as sensitive document content: don’t log it, don’t put it in analytics, don’t needlessly sync it to all clients if you can avoid it (web removes it from client game state after fetch / realtime merge).
- Invite-link privacy model is unchanged: anyone with the game UUID can play; questions already reveal document content.

---

## 10. Acceptance checklist (parity)

- [ ] Host can pick a PDF from create → Specific types of quiz.
- [ ] Topic + difficulty become inactive while PDF is selected; Clear restores topic mode.
- [ ] Geography and PDF clear each other.
- [ ] Files over **20 MB** are rejected with a clear error.
- [ ] PDFs with **> 30 pages** only use the **first 30**; UI discloses that.
- [ ] Extracted text is capped at **40 000** characters before create.
- [ ] Image-only / empty-text PDFs fail clearly (unless you later add OCR as a product decision).
- [ ] Create sends `source_text` + `PDF: {filename}` topic + `difficulty: medium`.
- [ ] Generated questions are about the document, not unrelated trivia.
- [ ] Rematch sends `game_id` and gets **new** questions when source is stored and quota allows.
- [ ] Rematch falls back to same questions on quota / missing source / generate failure.
- [ ] Non-PDF creates and rematches are unchanged.

---

## 11. Explicit non-goals (for this parity pass)

- Uploading the PDF file itself to your servers or object storage
- Server-side PDF parsing at create time (unless you deliberately choose that architecture while still sending the same effective `source_text` limits)
- Quizzing pages beyond the first 30
- Per-page UI for the host to pick which pages to include
- OCR for scanned PDFs
- Changing scoring, modes, or lobby rules for PDF rooms

---

## 12. Suggested mental model for the RN agent

Think of PDF quizzes as:

> **Same create/rematch pipeline as a normal AI quiz**, but the “topic” input is replaced by a **capped document excerpt** (`source_text`), the UI freezes topic/difficulty, the DB keeps that excerpt for rematch, and rematch reloads the excerpt by `game_id` instead of asking the user to re-upload the file.

Match those behaviors and limits; choose any native PDF text-extraction approach that produces the same capped excerpt before calling the existing web APIs.
