// ============================================================
// PDF-sourced quizzes — topic encoding + text / page limits
//
// Caps are sized for our quiz LLM chain (xAI Grok → OpenRouter
// gpt-4o / gpt-4o-mini). We keep source text well under typical
// 128k-token windows after prompts + JSON output headroom.
// ============================================================

/** Max upload size before text extraction (bytes). */
export const MAX_PDF_BYTES = 20 * 1024 * 1024;

/**
 * Only the first N pages are used for quiz generation.
 * Dense academic pages ≈ 2–3k chars; 30 pages stays inside our
 * char budget and model context with comfortable margin.
 */
export const MAX_PDF_PAGES = 30;

/**
 * Hard cap on extracted text sent to the LLM (chars).
 * ~40k chars ≈ 10k tokens — safe for Grok / gpt-4o with room for
 * system prompt + question JSON response.
 */
export const MAX_PDF_TEXT_CHARS = 40_000;

export const PDF_TOPIC_PREFIX = 'PDF:';

export interface PdfSource {
  fileName: string;
  text: string;
  /** Total pages in the uploaded file. */
  totalPages: number;
  /** Pages actually included in `text` (≤ MAX_PDF_PAGES). */
  usedPages: number;
}

export function isPdfTopic(topic: string): boolean {
  return topic.trim().startsWith(PDF_TOPIC_PREFIX);
}

export function encodePdfTopic(fileName: string): string {
  const clean = fileName.replace(/\s+/g, ' ').trim() || 'document.pdf';
  const topic = `${PDF_TOPIC_PREFIX} ${clean}`;
  return topic.length > 200 ? `${topic.slice(0, 197)}...` : topic;
}

export function displayPdfTopic(topic: string): string {
  if (!isPdfTopic(topic)) return topic;
  return topic.slice(PDF_TOPIC_PREFIX.length).trim() || topic;
}

export function truncatePdfText(text: string): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= MAX_PDF_TEXT_CHARS) return trimmed;
  return `${trimmed.slice(0, MAX_PDF_TEXT_CHARS)}\n\n[Document truncated for quiz generation.]`;
}

/** True when the quiz only covers a prefix of the uploaded PDF. */
export function isPdfTruncated(source: Pick<PdfSource, 'totalPages' | 'usedPages'>): boolean {
  return source.totalPages > source.usedPages;
}
