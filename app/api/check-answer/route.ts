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
      // Correct if the transcript contains the answer, OR the answer
      // contains the transcript (handles short one-word answers).
      if (
        candidate.length > 0 &&
        (normTranscript.includes(candidate) || candidate.includes(normTranscript))
      ) {
        return NextResponse.json({ correct: true, method: 'local' });
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
