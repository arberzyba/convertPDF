import { lineText } from './layout'
import type { Line, Page } from './types'

const PAGE_NUMBER = /^(?:(?:page|seite|p\.)\s*)?\d+(?:\s*(?:of|von|\/)\s*\d+)?$|^[-–—]\s*\d+\s*[-–—]$/i

const inMargin = (line: Line, page: Page) => line.y < page.height * 0.08 || line.y > page.height * 0.92

const dropLines = (pages: Page[], drop: (line: Line, page: Page) => boolean): Page[] =>
  pages.map((page) => ({ ...page, lines: page.lines.filter((line) => !drop(line, page)) }))

/** Removes margin lines that repeat on more than half the pages. Digits are ignored, so "Page 3" matches "Page 4". */
export function removeHeadersFooters(pages: Page[]): Page[] {
  const key = (line: Line) => lineText(line).replace(/\d+/g, '#')
  const counts = new Map<string, number>()
  for (const page of pages) {
    for (const k of new Set(page.lines.filter((line) => inMargin(line, page)).map(key))) {
      counts.set(k, (counts.get(k) ?? 0) + 1)
    }
  }
  const min = Math.max(1, pages.length / 2)
  return dropLines(pages, (line, page) => inMargin(line, page) && counts.get(key(line))! > min)
}

/** Removes margin lines that are only a page number, such as "7", "Page 7 of 12" or "- 7 -". */
export function removePageNumbers(pages: Page[]): Page[] {
  return dropLines(pages, (line, page) => inMargin(line, page) && PAGE_NUMBER.test(lineText(line)))
}
