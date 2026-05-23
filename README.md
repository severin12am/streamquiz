# StreamQuiz

A real-time two-player live quiz show for streamers. Built with Next.js 15, Supabase, and OpenAI.

## Deploy to Netlify (online testing with friends)

### 1. Push to GitHub
```bash
git add .
git commit -m "Initial StreamQuiz app"
# Create a new repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/streamquiz.git
git branch -M main
git push -u origin main
```

### 2. Connect Netlify
1. Go to [app.netlify.com](https://app.netlify.com) → **Add new site** → **Import an existing project**
2. Choose **GitHub** → select your `streamquiz` repo
3. Netlify should auto-detect Next.js. Confirm:
   - **Build command:** `npm run build`
   - **Publish directory:** leave default (Netlify Next.js plugin handles this)

### 3. Add environment variables
In Netlify → **Site configuration** → **Environment variables**, add:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://moyhwkzeetwkpqmhrcso.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your Supabase anon/publishable key |
| `OPENAI_API_KEY` | your OpenRouter key |

Click **Deploy site**.

### 4. Share the live URL
Netlify gives you something like `https://streamquiz.netlify.app`. Share that with friends — cameras and sync work over HTTPS.

---

### 1. Set up environment variables
```bash
cp .env.local.example .env.local
```
Open `.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL` — from Supabase → Project Settings → API
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — same place
- `OPENAI_API_KEY` — from platform.openai.com → API Keys

### 2. Set up the Supabase database
1. Open your Supabase project dashboard
2. Go to **SQL Editor → New Query**
3. Paste the contents of `supabase/schema.sql`
4. Click **Run**

### 3. Run the app
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## How to Play

1. **Host** goes to the home page → fills in topic, difficulty, number of questions → clicks **Create Challenge**
2. **Host** sees a QR code + shareable link → sends it to the streamer
3. **Streamer** opens the link → both cameras turn on automatically
4. **Host** clicks **START QUIZ** once the streamer is connected
5. Questions appear one by one — first to **BUZZ** answers
6. Host clicks **Correct** or **Wrong** — scores update live for both players
7. After all questions: winner screen + option to download video clips

---

## Key Settings (where to change things)

| Setting | File | What to edit |
|---|---|---|
| Buzz window (2s) | `hooks/useGameState.ts` | `BUZZ_WINDOW_SECONDS` |
| Question time (15s) | `hooks/useGameState.ts` | `QUESTION_TIME_SECONDS` |
| Column widths | `components/GameScreen.tsx` | `flex-[3]` / `flex-[4]` values |
| AI prompt | `app/api/generate-questions/route.ts` | `systemPrompt` / `userPrompt` |
| OpenAI model | `app/api/generate-questions/route.ts` | `model:` field |
| Scoring | `hooks/useGameState.ts` | `judgeAnswer()` and `submitMCAnswer()` |
| Camera quality | `hooks/useWebRTC.ts` | `getUserMedia` constraints |
| Voice language | `hooks/useSpeechRecognition.ts` | `recognition.lang` |

---

## Project Structure

```
app/
  page.tsx                    ← Home / create game
  game/[id]/page.tsx          ← Game screen (both players)
  api/generate-questions/     ← OpenAI question generation

components/
  GameScreen.tsx              ← Main 3-column layout
  CameraPanel.tsx             ← Single camera panel (left/right)
  QuestionPanel.tsx           ← Middle panel (question + timer + scores)
  BuzzButton.tsx              ← Big red BUZZ button
  MCOptions.tsx               ← Multiple choice A/B/C/D grid
  ScoreBoard.tsx              ← Live score display
  CountdownTimer.tsx          ← Circular SVG countdown
  CreateGame.tsx              ← Host creation form
  WinnerScreen.tsx            ← End-of-game overlay

hooks/
  useGameState.ts             ← All game logic + Supabase sync
  useWebRTC.ts                ← Peer-to-peer cameras
  useSpeechRecognition.ts     ← Browser voice recognition
  useMediaRecorder.ts         ← Answer clip recording

lib/
  supabase.ts                 ← Supabase client + helpers
  types.ts                    ← All TypeScript types

supabase/
  schema.sql                  ← Run this once to set up the DB
```

---

## Tech Stack

- **Next.js 15** (App Router)
- **Tailwind CSS** (dark TV-show theme)
- **Supabase** (Realtime sync + database)
- **OpenAI API** (question generation, gpt-4o-mini)
- **WebRTC** (peer-to-peer camera streaming via Supabase Broadcast signaling)
- **Web Speech API** (browser voice recognition, Chrome/Edge only)
- **MediaRecorder API** (answer clip recording)
