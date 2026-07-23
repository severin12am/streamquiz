// ============================================================
// Client-side PDF text extraction (dynamic unpdf import)
//
// Only the first MAX_PDF_PAGES are read — long PDFs (hundreds of
// pages) never dump their full text into the LLM prompt.
// ============================================================

import {
  MAX_PDF_BYTES,
  MAX_PDF_PAGES,
  truncatePdfText,
  type PdfSource,
} from './pdf-source';

function pageTextFromContent(content: { items: Array<{ str?: string }> }): string {
  return content.items
    .map((item) => (typeof item.str === 'string' ? item.str : ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

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
    throw new Error('PDF is too large (max 20 MB).');
  }

  const { getDocumentProxy } = await import('unpdf');
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocumentProxy(data);
  const totalPages =
    typeof pdf.numPages === 'number' && pdf.numPages > 0 ? pdf.numPages : 0;
  if (totalPages === 0) {
    throw new Error('Could not read that PDF.');
  }

  const usedPages = Math.min(totalPages, MAX_PDF_PAGES);
  const pageTexts: string[] = [];
  for (let i = 1; i <= usedPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = pageTextFromContent(content as { items: Array<{ str?: string }> });
    if (pageText) pageTexts.push(pageText);
  }

  const merged = pageTexts.join('\n\n');
  let text = truncatePdfText(merged);

  if (totalPages > usedPages) {
    text = `${text}\n\n[Quiz uses the first ${usedPages} of ${totalPages} pages.]`;
  }

  if (text.replace(/\s+/g, ' ').trim().length < 40) {
    throw new Error(
      'Could not read enough text from that PDF. Try a text-based PDF (not a scanned image).',
    );
  }

  return {
    fileName: file.name,
    text,
    totalPages,
    usedPages,
  };
}
