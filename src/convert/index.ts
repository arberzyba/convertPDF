import { getDocument, GlobalWorkerOptions, PasswordResponses } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { removeHeadersFooters, removePageNumbers } from './cleanup'
import { extractPage } from './extract'
import { lineText, toBlocks } from './layout'
import { ocrPage } from './ocr'
import { parsePageRange } from './pageRange'
import { render } from './render'
import type { Format, Page } from './types'

GlobalWorkerOptions.workerSrc = workerUrl

// pdf.js resolves these from inside its worker, so they must be absolute.
const asset = (dir: string) => new URL(`pdfjs/${dir}/`, document.baseURI).href

/** Pages with less text than this are treated as scans. */
const MIN_TEXT_LENGTH = 20

export interface Options {
  format: Format
  removeHeadersFooters: boolean
  removePageNumbers: boolean
  ocrLang: string
}

export interface Result {
  text: string
  format: Format
  pages: number
  ocrPages: number
}

export async function convertPdf(
  file: File,
  pageRange: string,
  options: Options,
  onProgress: (message: string) => void,
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
    for (const [i, number] of numbers.entries()) {
      const progress = `Page ${i + 1} of ${numbers.length}`
      onProgress(progress)
      const pdfPage = await pdf.getPage(number)
      const page = await extractPage(pdfPage)
      if (page.lines.reduce((sum, line) => sum + lineText(line).length, 0) < MIN_TEXT_LENGTH) {
        onProgress(`${progress} (reading scanned page)`)
        page.ocrText = await ocrPage(pdfPage, options.ocrLang)
        ocrPages++
      }
      pdfPage.cleanup()
      signal.throwIfAborted()
      pages.push(page)
    }
    if (options.removeHeadersFooters) pages = removeHeadersFooters(pages)
    if (options.removePageNumbers) pages = removePageNumbers(pages)
    const text = render(toBlocks(pages), options.format)
    return { text, format: options.format, pages: numbers.length, ocrPages }
  } finally {
    await task.destroy()
  }
}
