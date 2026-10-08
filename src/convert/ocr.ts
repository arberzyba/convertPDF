import type { PDFPageProxy } from 'pdfjs-dist'
import type { Worker } from 'tesseract.js'

let worker: Promise<Worker> | undefined
let workerLang = ''

/** Renders a page to an image and reads its text. The OCR engine is downloaded on first use. */
export async function ocrPage(page: PDFPageProxy, lang: string): Promise<string> {
  const viewport = page.getViewport({ scale: 2 })
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  await page.render({ canvas, viewport }).promise
  if (workerLang !== lang) {
    await stopOcr()
    worker = import('tesseract.js').then(async ({ createWorker, PSM }) => {
      const created = await createWorker(lang)
      // Full layout analysis, so that paragraphs and columns are kept apart.
      await created.setParameters({ tessedit_pageseg_mode: PSM.AUTO })
      return created
    })
    workerLang = lang
  }
  const { data } = await (await worker!).recognize(canvas, {}, { blocks: true })
  return data.blocks!.flatMap((block) => block.paragraphs.map((paragraph) => paragraph.text)).join('\n\n')
}

/** Frees the OCR engine's memory. */
export async function stopOcr(): Promise<void> {
  const current = worker
  worker = undefined
  workerLang = ''
  await (await current)?.terminate()
}
