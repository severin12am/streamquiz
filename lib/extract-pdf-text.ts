// ============================================================
// Client-side PDF text extraction (dynamic unpdf import)
// ============================================================

import {
  MAX_PDF_BYTES,
  truncatePdfText,
  type PdfSource,
} from './pdf-source';

export async function extractPdfSource(file: File): Promise<PdfSource> {
  if (!file || file.type !== 'application/pdf') {
    // Some browsers omit MIME for .pdf — fall back to extension.
    if (!file?.name?.toLowerCase().endsWith('.pdf')) {
      throw new Error('Please drop a PDF file.');
    }
  }
  if (file.size <= 0) {
    throw new Error('That PDF is empty.');
  }
  if (file.size > MAX_PDF_BYTES) {
    throw new Error('PDF is too large (max 8 MB).');
  }

  const { extractText, getDocumentProxy } = await import('unpdf');
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocumentProxy(data);
  const { text } = await extractText(pdf, { mergePages: true });
  const merged = Array.isArray(text) ? text.join('\n') : String(text ?? '');
  const truncated = truncatePdfText(merged);

  if (truncated.length < 40) {
    throw new Error(
      'Could not read enough text from that PDF. Try a text-based PDF (not a scanned image).',
    );
  }

  return { fileName: file.name, text: truncated };
}
