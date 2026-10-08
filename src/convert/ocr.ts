import type { PDFPageProxy } from 'pdfjs-dist'
import type { Worker } from 'tesseract.js'
import type { Span } from './types'

/** Pages are rendered at 72 dpi times this before being read; OCR needs about 300 dpi to be accurate. */
const SCALE = 4

let worker: Promise<Worker> | undefined
let workerLang = ''

/** Renders a page to an image and reads its words with their positions. The OCR engine is downloaded on first use. */
export async function ocrPage(page: PDFPageProxy, lang: string): Promise<Span[]> {
  const viewport = page.getViewport({ scale: SCALE })
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  await page.render({ canvas, viewport }).promise
  if (workerLang !== lang) {
    await stopOcr()
    worker = import('tesseract.js').then(async ({ createWorker, PSM }) => {
      const created = await createWorker(lang)
      // Full layout analysis, so that columns are read separately.
      await created.setParameters({ tessedit_pageseg_mode: PSM.AUTO })
      return created
    })
    workerLang = lang
  }
  const { data } = await (await worker!).recognize(canvas, {}, { blocks: true })
  const lines = data.blocks!.flatMap((block) => block.paragraphs).flatMap((paragraph) => paragraph.lines)
  return lines.flatMap((line) =>
    line.words.map((word) => ({
      // Words on a blurry scan can touch, so the space is added here and not inferred from the gap.
      text: `${word.text} `,
      x: word.bbox.x0 / SCALE,
      xEnd: word.bbox.x1 / SCALE,
      y: (line.baseline.y0 + line.baseline.y1) / 2 / SCALE,
      size: line.rowAttributes.rowHeight / SCALE,
    })),
  )
}

/** Frees the OCR engine's memory. */
export async function stopOcr(): Promise<void> {
  const current = worker
  worker = undefined
  workerLang = ''
  await (await current)?.terminate()
}
