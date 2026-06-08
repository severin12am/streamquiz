// ============================================================
// Session-scoped question memory — reduces repeats per topic
// within the same browser tab. Best-effort only (never required).
// ============================================================

import type { Question } from './types';

const STORAGE_KEY = 'streamquiz-recent-questions';
const MAX_PER_TOPIC = 24;

type Store = Record<string, string[]>;

function readStore(): Store {
  if (typeof window === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Private mode, quota, or storage disabled — ignore.
  }
}

function topicKey(topic: string): string {
  return topic.trim().toLowerCase();
}

/** Recent question texts for this topic in the current session. */
export function getPreviousQuestions(topic: string): string[] {
  const key = topicKey(topic);
  return readStore()[key]?.slice(-MAX_PER_TOPIC) ?? [];
}

/** Append generated questions to session memory for this topic. */
export function rememberQuestions(topic: string, questions: Question[]): void {
  const texts = questions
    .map((q) => String(q.question ?? '').trim())
    .filter(Boolean);
  if (texts.length === 0) return;

  const key = topicKey(topic);
  const store = readStore();
  const merged = [...(store[key] ?? []), ...texts].slice(-MAX_PER_TOPIC);
  store[key] = merged;
  writeStore(store);
}

/**
 * Drop any questions whose text was already seen this session for the
 * topic (case-insensitive), plus de-dupe within the batch. Used on
 * rematch so a fresh game never repeats earlier questions even if the
 * generator slips one through.
 */
export function filterUnseenQuestions(topic: string, questions: Question[]): Question[] {
  const seen = new Set(getPreviousQuestions(topic).map((q) => q.trim().toLowerCase()));
  const out: Question[] = [];
  for (const q of questions) {
    const key = String(q.question ?? '').trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(q);
  }
  return out;
}

/** Session history plus extra texts (e.g. current game), deduped. */
export function mergePreviousQuestions(topic: string, extra: string[]): string[] {
  const combined = [...getPreviousQuestions(topic), ...extra];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const q of combined) {
    const trimmed = q.trim();
    if (!trimmed) continue;
    const k = trimmed.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(trimmed);
  }
  return out.slice(-MAX_PER_TOPIC);
}
