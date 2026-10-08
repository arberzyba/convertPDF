import { getDocument, GlobalWorkerOptions, PasswordResponses } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { removeHeadersFooters, removePageNumbers } from './cleanup'
import { extractPage, isScan } from './extract'
import { buildLines, lineText, toBlocks } from './layout'
import { ocrPage } from './ocr'
import { parsePageRange } from './pageRange'
import { render } from './render'
import type { Format, Page } from './types'

GlobalWorkerOptions.workerSrc = workerUrl

// pdf.js resolves these from inside its worker, so they must be absolute.
const asset = (dir: string) => new URL(`pdfjs/${dir}/`, document.baseURI).href

/** Pages with less text than this are read with OCR, as are pages that are an image of a document. */
const MIN_TEXT_LENGTH = 20

export interface Options {
  format: Format
  removeHeadersFooters: boolean
  removePageNumbers: boolean
  /** A key of LANGUAGES, or 'auto' to identify the language of each file. */
  ocrLang: string
}

export interface Result {
  text: string
  format: Format
  pages: number
  ocrPages: number
  /** The language scanned pages were read in, or 'auto' if none could be identified. */
  ocrLang: string
}

export async function convertPdf(
  file: File,
  pageRange: string,
  options: Options,
  onProgress: (message: string, fraction: number) => void,
  signal: AbortSignal,
): Promise<Result> {
  const task = getDocument({ data: await file.arrayBuffer(), cMapUrl: asset('cmaps'), wasmUrl: asset('wasm') })
  task.onPassword = (update: (password: string | Error) => void, reason: number) => {
    const wrong = reason === PasswordResponses.INCORRECT_PASSWORD
    const password = prompt(`${wrong ? 'Wrong password. ' : ''}Password for ${file.name}:`)
    update(password ?? new Error('A password is needed to open this PDF'))
  }
  try {
    const pdf = await task.promise
    const numbers = parsePageRange(pageRange, pdf.numPages)
    let pages: Page[] = []
    let ocrPages = 0
    // Once a scanned page's language has been identified, the rest of the file is read in it.
    let ocrLang = options.ocrLang
    for (const [i, number] of numbers.entries()) {
      const progress = `Page ${i + 1} of ${numbers.length}`
      onProgress(progress, i / numbers.length)
      const pdfPage = await pdf.getPage(number)
      const page = await extractPage(pdfPage)
      const textLength = page.lines.reduce((sum, line) => sum + lineText(line).length, 0)
      if (textLength < MIN_TEXT_LENGTH || (await isScan(pdfPage))) {
        onProgress(`${progress} (reading scanned page)`, i / numbers.length)
        const read = await ocrPage(pdfPage, ocrLang)
        page.lines = buildLines(read.spans)
        ocrLang = read.lang
        ocrPages++
      }
      pdfPage.cleanup()
      signal.throwIfAborted()
      pages.push(page)
    }
    if (options.removeHeadersFooters) pages = removeHeadersFooters(pages)
    if (options.removePageNumbers) pages = removePageNumbers(pages)
    const text = render(toBlocks(pages), options.format)
    return { text, format: options.format, pages: numbers.length, ocrPages, ocrLang }
  } finally {
    await task.destroy()
  }
}
