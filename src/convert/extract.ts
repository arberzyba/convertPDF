import { OPS, Util, type PDFPageProxy } from 'pdfjs-dist'
import { buildLines } from './layout'
import type { Page, Span } from './types'

/**
 * Whether images cover most of the page, as on a scan. A scan can still contain text: scanners often add a
 * hidden layer from their own OCR, which is frequently poor.
 */
export async function isScan(page: PDFPageProxy): Promise<boolean> {
  const { fnArray, argsArray } = await page.getOperatorList()
  const [x0, y0, x1, y1] = page.view
  const stack: number[][] = []
  let matrix = [1, 0, 0, 1, 0, 0]
  let imageArea = 0
  for (let i = 0; i < fnArray.length; i++) {
    const op = fnArray[i]
    if (op === OPS.save) stack.push(matrix)
    else if (op === OPS.restore) matrix = stack.pop() ?? matrix
    else if (op === OPS.transform) matrix = Util.transform(matrix, argsArray[i])
    else if (op === OPS.paintImageXObject || op === OPS.paintInlineImageXObject) {
      // An image is drawn into a 1 by 1 square, so the determinant of the matrix is its area on the page.
      imageArea += Math.abs(matrix[0] * matrix[3] - matrix[1] * matrix[2])
    }
  }
  return imageArea > 0.7 * (x1 - x0) * (y1 - y0)
}

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
