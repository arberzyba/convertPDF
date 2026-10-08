import { expect, test } from 'vitest'
import { removeHeadersFooters, removePageNumbers } from '../cleanup'
import { buildLines, lineText } from '../layout'
import type { Page } from '../types'

const page = (...lines: [text: string, y: number][]): Page => ({
  width: 600,
  height: 800,
  lines: buildLines(lines.map(([text, y]) => ({ text, x: 50, xEnd: 50 + text.length * 5, y, size: 10 }))),
})

const texts = (pages: Page[]) => pages.map((p) => p.lines.map(lineText))

test('removes margin lines that repeat across pages, ignoring digits', () => {
  const pages = [1, 2, 3].map((n) =>
    page(['Acme Journal', 30], [`Body ${n}`, 400], [`Page ${n} of 3`, 780], ...(n === 1 ? [['Draft', 40] as [string, number]] : [])),
  )
  expect(texts(removeHeadersFooters(pages))).toEqual([['Draft', 'Body 1'], ['Body 2'], ['Body 3']])
})

test('keeps repeated lines that are not in the margin, and everything on a single page', () => {
  const repeated = [page(['Same', 400]), page(['Same', 400])]
  expect(texts(removeHeadersFooters(repeated))).toEqual([['Same'], ['Same']])
  expect(texts(removeHeadersFooters([page(['Header', 30])]))).toEqual([['Header']])
})

test('removes page numbers from the margin only', () => {
  const pages = [page(['3', 400], ['7', 780]), page(['Page 8 of 12', 30], ['- 8 -', 780], ['Chapter 8', 785])]
  expect(texts(removePageNumbers(pages))).toEqual([['3'], ['Chapter 8']])
})
