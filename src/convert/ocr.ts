import type { PDFPageProxy } from 'pdfjs-dist'
import type { Worker } from 'tesseract.js'
import type { Span } from './types'

/** Languages that scanned pages can be read in, by Tesseract language code. */
export const LANGUAGES: Record<string, string> = {
  eng: 'English',
  deu: 'German',
  fra: 'French',
  spa: 'Spanish',
  ita: 'Italian',
  por: 'Portuguese',
  nld: 'Dutch',
  sqi: 'Albanian',
  pol: 'Polish',
  ces: 'Czech',
  slk: 'Slovak',
  hun: 'Hungarian',
  ron: 'Romanian',
  hrv: 'Croatian',
  slv: 'Slovenian',
  swe: 'Swedish',
  dan: 'Danish',
  nor: 'Norwegian',
  fin: 'Finnish',
  tur: 'Turkish',
}

/** Languages that the language-identification library knows under a different code. */
const IDENTIFIED_AS: Record<string, string> = { sqi: 'als', nor: 'nob' }

/** Pages are rendered at 72 dpi times this before being read; OCR needs about 300 dpi to be accurate. */
const SCALE = 4

/** Lines whose words average less than this confidence (out of 100) are dropped. Real text scores around 90. */
const MIN_CONFIDENCE = 65

let worker: Promise<Worker> | undefined
let workerLang = ''

async function read(canvas: HTMLCanvasElement, lang: string): Promise<Span[]> {
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
  const lines = data.blocks!
    .flatMap((block) => block.paragraphs)
    .flatMap((paragraph) => paragraph.lines)
    // Signatures, stamps and logos are read as junk that the engine itself has little confidence in.
    .filter((line) => line.words.reduce((sum, word) => sum + word.confidence, 0) >= MIN_CONFIDENCE * line.words.length)
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

/**
 * Renders a page to an image and reads its words with their positions. With the language 'auto', the page is
 * read once to identify its language and, if that was not the language used, read again. Returns the language
 * found, or 'auto' if the page has too little text to tell. The OCR engine is downloaded on first use.
 */
export async function ocrPage(page: PDFPageProxy, lang: string): Promise<{ spans: Span[]; lang: string }> {
  const viewport = page.getViewport({ scale: SCALE })
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  await page.render({ canvas, viewport }).promise
  if (lang !== 'auto') return { spans: await read(canvas, lang), lang }

  // Any Latin-alphabet model reads the words well enough to identify the language, so reuse the loaded one.
  const first = workerLang || 'eng'
  const spans = await read(canvas, first)
  const { franc } = await import('franc')
  const codes = Object.keys(LANGUAGES)
  const identified = franc(spans.map((span) => span.text).join(''), { only: codes.map((c) => IDENTIFIED_AS[c] ?? c) })
  const found = codes.find((code) => (IDENTIFIED_AS[code] ?? code) === identified)
  if (!found) return { spans, lang: 'auto' }
  return { spans: found === first ? spans : await read(canvas, found), lang: found }
}

/** Frees the OCR engine's memory. */
export async function stopOcr(): Promise<void> {
  const current = worker
  worker = undefined
  workerLang = ''
  await (await current)?.terminate()
}
