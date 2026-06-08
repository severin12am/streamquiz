// ============================================================
// API Route: POST /api/check-answer
//
// Automatically judges an OPEN-ENDED spoken answer.
// Replaces the old "host clicks Correct/Wrong" flow.
//
// Input  (JSON): { question, correct_answer, accepted_answers, transcript }
// Output (JSON): { correct: boolean }
//
// HOW IT JUDGES (two layers, fast → smart):
//   1. LOCAL fuzzy check first (free, instant): normalises both
//      strings and checks whether the correct answer (or any
//      accepted phrasing) appears inside the transcript. This
//      catches the common case — e.g. transcript
//      "um the pacific ocean i think" contains "pacific ocean".
//   2. If the local check is inconclusive, ask the AI to decide.
//      The AI is lenient about filler words, spelling, and speech-
//      to-text errors but strict about actually being correct.
//
// TUNING:
//   - To make judging stricter/looser, edit the AI system prompt.
//   - To skip the AI entirely (local-only), set USE_AI_FALLBACK=false.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const USE_AI_FALLBACK = true; // set false to judge with local matching only

let openai: OpenAI | null = null;
function getOpenAI() {
  if (!openai) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY is not set');
    openai = new OpenAI({ apiKey: key, baseURL: 'https://openrouter.ai/api/v1' });
  }
  return openai;
}

// Normalise text for comparison: lowercase, strip punctuation,
// collapse whitespace. "The Pacific Ocean!" → "the pacific ocean"
//
// IMPORTANT: use Unicode letter/number classes (\p{L}\p{N} with the `u`
// flag) instead of \w. \w only matches Latin a-z0-9_, so Cyrillic (and
// any non-Latin script) was being stripped to an empty string — which
// made every Russian answer judged as wrong.
function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Minimum character similarity (0..1) for a local match. Spoken answers
// and speech-to-text often differ by a few characters from the canonical
// answer; a 70% character match accepts those near-misses locally without
// needing the AI judge.
const CHAR_MATCH_THRESHOLD = 0.7;

// Levenshtein edit distance between two strings (iterative, O(n·m)).
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,        // deletion
        curr[j - 1] + 1,    // insertion
        prev[j - 1] + cost  // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

// Character-similarity ratio (0..1): 1 = identical, 0 = completely different.
function similarity(a: string, b: string): number {
  if (!a && !b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

// Best similarity between a candidate answer and the transcript: compares
// against the whole transcript AND against every word-window the same
// length as the candidate (so "the answer is pacific ocean" still matches
// "pacific ocean" strongly even with extra filler words around it).
function bestSimilarity(transcript: string, candidate: string): number {
  if (!candidate) return 0;
  let best = similarity(transcript, candidate);

  const words = transcript.split(' ').filter(Boolean);
  const span = candidate.split(' ').filter(Boolean).length || 1;
  for (let i = 0; i + span <= words.length; i++) {
    const window = words.slice(i, i + span).join(' ');
    const s = similarity(window, candidate);
    if (s > best) best = s;
  }
  return best;
}

export async function POST(req: NextRequest) {
  try {
    const { question, correct_answer, accepted_answers, transcript } =
      await req.json();

    const normTranscript = normalise(String(transcript ?? ''));

    // Empty / no speech detected → automatically wrong
    if (!normTranscript) {
      return NextResponse.json({ correct: false });
    }

    // -------------------------------------------------------
    // Layer 1: local fuzzy matching
    // -------------------------------------------------------
    const candidates: string[] = [
      String(correct_answer ?? ''),
      ...(Array.isArray(accepted_answers) ? accepted_answers : []),
    ]
      .map(normalise)
      .filter(Boolean);

    for (const candidate of candidates) {
      if (candidate.length === 0) continue;

      // Correct if the transcript contains the answer, OR the answer
      // contains the transcript (handles short one-word answers).
      if (normTranscript.includes(candidate) || candidate.includes(normTranscript)) {
        return NextResponse.json({ correct: true, method: 'local' });
      }

      // Otherwise accept a close character match (>= 70%) — tolerates
      // speech-to-text slips, typos, and minor misspellings.
      if (bestSimilarity(normTranscript, candidate) >= CHAR_MATCH_THRESHOLD) {
        return NextResponse.json({ correct: true, method: 'local-fuzzy' });
      }
    }

    // -------------------------------------------------------
    // Layer 2: AI judge (only if local check didn't confirm)
    // -------------------------------------------------------
    if (!USE_AI_FALLBACK) {
      return NextResponse.json({ correct: false, method: 'local' });
    }

    const ai = getOpenAI();
    const completion = await ai.chat.completions.create({
      model: 'openai/gpt-4o-mini',
      temperature: 0, // deterministic judging
      max_tokens: 5,
      messages: [
        {
          role: 'system',
          content:
            'You are a lenient but fair quiz judge. The player answered by voice, ' +
            'so the transcript may contain filler words, mishearings, or extra text. ' +
            'Decide if the player essentially gave the correct answer. ' +
            'Reply with EXACTLY one word: "YES" or "NO".',
        },
        {
          role: 'user',
          content:
            `Question: ${question}\n` +
            `Correct answer: ${correct_answer}\n` +
            `Player said (transcript): "${transcript}"\n\n` +
            `Did the player give the correct answer? Reply YES or NO.`,
        },
      ],
    });

    const reply = (completion.choices[0].message.content ?? '').toUpperCase();
    const correct = reply.includes('YES');

    return NextResponse.json({ correct, method: 'ai' });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[check-answer] Error:', message);
    // On failure, default to WRONG so the game can continue
    return NextResponse.json({ correct: false, error: message }, { status: 200 });
  }
}
