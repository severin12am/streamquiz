// ============================================================
// WhoSmarter — AI provider chain (SERVER ONLY)
//
// A small, ordered list of OpenAI-SDK-compatible chat providers.
// We try them in order and fall back to the next one on failure:
//
//   1. xAI (Grok)          — primary       (XAI_API_KEY)
//   2. OpenRouter / OpenAI — fallback      (OPENAI_API_KEY)
//
// Every provider exposes the OpenAI Chat Completions interface, so we
// reuse a single request shape for all of them. Each provider can list
// MORE THAN ONE model to try (e.g. a strong model first, then a cheaper
// one) before we move on to the next provider.
//
// NEVER import this from client components — it reads server-only keys.
// ============================================================

import OpenAI from 'openai';
import type { Difficulty } from './types';

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

interface ProviderConfig {
  name: string;
  apiKey: string | undefined;
  baseURL: string;
  /** Ordered models to try for a given difficulty (first → last). */
  models: (difficulty: Difficulty) => string[];
}

// ---- Model selection (override via env without touching code) ----
//
// xAI flagship model. Defaults to a current Grok model; override with
// XAI_MODEL if xAI renames/retires it. XAI_MODEL_EASY lets you use a
// cheaper model for easy quizzes.
const XAI_MODEL = process.env.XAI_MODEL?.trim() || 'grok-4.3';
const XAI_MODEL_EASY = process.env.XAI_MODEL_EASY?.trim() || XAI_MODEL;

// Fallback provider models (OpenRouter naming by default).
const FALLBACK_MODEL = process.env.FALLBACK_MODEL?.trim() || 'openai/gpt-4o';
const FALLBACK_MODEL_EASY =
  process.env.FALLBACK_MODEL_EASY?.trim() || 'openai/gpt-4o-mini';

const PROVIDERS: ProviderConfig[] = [
  // 1) PRIMARY — xAI (Grok)
  {
    name: 'xai',
    apiKey: process.env.XAI_API_KEY,
    baseURL: process.env.XAI_BASE_URL?.trim() || 'https://api.x.ai/v1',
    models: (d) => [d === 'easy' ? XAI_MODEL_EASY : XAI_MODEL],
  },
  // 2) FALLBACK — existing provider (OpenRouter, or real OpenAI).
  //    Lists a stronger model then the mini as a secondary fallback.
  {
    name: 'fallback',
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL?.trim() || 'https://openrouter.ai/api/v1',
    models: (d) =>
      d === 'easy'
        ? [FALLBACK_MODEL_EASY]
        : [FALLBACK_MODEL, FALLBACK_MODEL_EASY],
  },
];

// Cache one OpenAI client per provider (keyed by name) so we don't
// rebuild it on every request.
const clientCache = new Map<string, OpenAI>();
function clientFor(provider: ProviderConfig): OpenAI {
  const cached = clientCache.get(provider.name);
  if (cached) return cached;
  const client = new OpenAI({
    apiKey: provider.apiKey!,
    baseURL: provider.baseURL,
  });
  clientCache.set(provider.name, client);
  return client;
}

export interface ChatResult {
  content: string;
  provider: string;
  model: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
}

/**
 * Run a chat completion against the provider chain. Tries xAI first, then
 * the fallback provider, then each provider's secondary models. Returns the
 * first non-empty response. Throws only if EVERY configured provider fails.
 */
export async function chatWithFallback(
  messages: ChatMessage[],
  difficulty: Difficulty,
  options: ChatOptions = {},
): Promise<ChatResult> {
  const { temperature = 0.8, maxTokens = 3000 } = options;
  const errors: string[] = [];
  let configuredCount = 0;

  for (const provider of PROVIDERS) {
    if (!provider.apiKey) continue; // skip providers without a key
    configuredCount++;
    const client = clientFor(provider);

    for (const model of provider.models(difficulty)) {
      try {
        const completion = await client.chat.completions.create({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        });
        const content = completion.choices[0]?.message?.content ?? '';
        if (content.trim()) {
          return { content, provider: provider.name, model };
        }
        errors.push(`${provider.name}/${model}: empty response`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${provider.name}/${model}: ${msg}`);
        // Log so we can see WHICH provider failed and why.
        console.warn(`[ai] ${provider.name}/${model} failed → trying next:`, msg);
      }
    }
  }

  if (configuredCount === 0) {
    throw new Error(
      'No AI provider configured. Set XAI_API_KEY (primary) and/or OPENAI_API_KEY (fallback).',
    );
  }
  throw new Error(`All AI providers failed. ${errors.join(' | ')}`);
}
