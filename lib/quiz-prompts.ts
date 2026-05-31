// ============================================================
// Quiz generation prompts — shared by /api/generate-questions
// ============================================================

import type { Difficulty } from './types';

const DIFFICULTY_GUIDE: Record<Difficulty, string> = {
  easy: `Very simple, widely known facts suitable for a general audience with ZERO prior study of the topic.
- Only use the most famous names, events, basic definitions, or things most people have heard of.
- Questions must be answerable by someone with casual or pop-culture exposure only.`,

  medium: `Moderately challenging — requires having read, watched, or studied the topic (high-school or casual enthusiast level).
- Go beyond the single most obvious or famous fact about the topic.
- Include specific works, key events, important arguments, distinctions, or slightly less mainstream people and ideas.
- Should feel like a solid, interesting quiz — not too easy, not expert-level.`,

  hard: `Expert-level trivia that would stump most people who are interested in the topic, including dedicated fans.
- Focus on obscure details, precise facts, lesser-known figures, technical nuances, niche subtopics, or non-obvious connections.
- Should feel like an advanced quiz night, not introductory trivia.
- The correct answer should be something many knowledgeable people would still get wrong.`,
};

export interface BuildPromptsParams {
  topic: string;
  difficulty: Difficulty;
  count: number;
  mcMode: boolean;
  languageInstruction: string;
  /** Question texts to avoid repeating (optional). */
  previousQuestions?: string[];
}

export function buildQuestionPrompts(params: BuildPromptsParams): {
  systemPrompt: string;
  userPrompt: string;
} {
  const {
    topic,
    difficulty,
    count,
    mcMode,
    languageInstruction,
    previousQuestions = [],
  } = params;

  const difficultyGuide = DIFFICULTY_GUIDE[difficulty];

  const avoidBlock =
    previousQuestions.length > 0
      ? `\nIMPORTANT: Do NOT repeat or closely paraphrase any of these previously used questions:\n${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
      : '';

  const systemPrompt = `You are an expert quiz writer for a live TV quiz show.

Core rules (follow strictly):
1. Follow the difficulty guide EXACTLY. Never make easy or medium questions accidentally hard, or hard questions too easy.
2. Never reuse the same famous fact at the wrong difficulty. Easy = only the greatest hits. Medium = one level deeper. Hard = expert or obscure.
3. Cover a wide spread of subtopics within "${topic}" (different eras, fields, regions, aspects, etc.). Do not focus on one narrow area.
4. Prioritize fresh, less-used angles. Avoid common quiz clichés and the most obvious fact about the topic.
5. Every question must have exactly one unambiguously correct answer. No trick questions, opinion questions, or multiple valid answers.
6. Return ONLY valid JSON — no markdown, no code fences, no text outside the JSON.
   Start with [ or { and end with ] or }.

Difficulty guide for this request (${difficulty}):
${difficultyGuide}${avoidBlock}`;

  const mcInstructions = mcMode
    ? `Each question must include:
   - "options": an array of EXACTLY 4 short answer choices
   - "correct_answer": the text of the correct option (must match one option exactly)`
    : `Each question must include:
   - "correct_answer": the single canonical correct answer, kept SHORT (1-5 words)
   - "accepted_answers": an array of 2-5 alternative acceptable phrasings or synonyms
     (e.g. for "Pacific Ocean" include "the Pacific", "Pacific"). Lowercase is fine.`;

  const formatExample = mcMode
    ? `{
  "question": "string",
  "options": ["string","string","string","string"],
  "correct_answer": "string"
}

Example:
{"question":"What is the capital of France?","options":["London","Paris","Berlin","Madrid"],"correct_answer":"Paris"}`
    : `{
  "question": "string",
  "correct_answer": "string",
  "accepted_answers": ["string","string"]
}

Example:
{"question":"What is the largest ocean on Earth?","correct_answer":"Pacific Ocean","accepted_answers":["pacific","the pacific","pacific ocean"]}`;

  const userPrompt = `${languageInstruction}

Generate exactly ${count} quiz questions about: "${topic}".
Difficulty: ${difficulty}.

${mcInstructions}

Return a JSON array where each item has this shape:
${formatExample}`;

  return { systemPrompt, userPrompt };
}
