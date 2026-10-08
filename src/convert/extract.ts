import { Util, type PDFPageProxy } from 'pdfjs-dist'
import { buildLines } from './layout'
import type { Page, Span } from './types'

/** Reads a page's text with its position and size, grouped into lines. */
export async function extractPage(page: PDFPageProxy): Promise<Page> {
  const viewport = page.getViewport({ scale: 1 })
  const content = await page.getTextContent()
  const spans: Span[] = []
  for (const item of content.items) {
    if (!('str' in item) || !item.str.trim()) continue
    const [, , c, d, x, y] = Util.transform(viewport.transform, item.transform)
    spans.push({ text: item.str, x, xEnd: x + item.width, y, size: Math.hypot(c, d) })
  }
  return { width: viewport.width, height: viewport.height, lines: buildLines(spans) }
}
