import type { Block, Cell, Line, Page, Span } from './types'

const LIST_ITEM = /^([•●○◦▪■‣⁃·*\-–—]|\d{1,3}[.)]|[a-z]\))\s+(.+)$/

/** Groups positioned spans into lines, and each line into cells separated by wide gaps. */
export function buildLines(spans: Span[]): Line[] {
  const lines: Span[][] = []
  for (const span of [...spans].sort((a, b) => a.y - b.y)) {
    const line = lines.at(-1)
    if (line && Math.abs(span.y - line[0].y) <= 0.4 * Math.max(span.size, line[0].size)) line.push(span)
    else lines.push([span])
  }
  return lines.map((line) => {
    line.sort((a, b) => a.x - b.x)
    const cells: Cell[] = []
    for (const span of line) {
      const cell = cells.at(-1)
      // Word gaps in justified text reach about 1.3 times the font size; column and table gaps are wider.
      if (cell && span.x - cell.xEnd <= 1.5 * span.size) {
        cell.spans.push(span)
        cell.xEnd = Math.max(cell.xEnd, span.xEnd)
      } else {
        cells.push({ x: span.x, xEnd: span.xEnd, spans: [span] })
      }
    }
    const main = line.reduce((a, b) => (b.text.length > a.text.length ? b : a))
    return { y: main.y, size: Math.round(main.size * 2) / 2, cells }
  })
}

function cellText(cell: Cell): string {
  let out = ''
  cell.spans.forEach((span, i) => {
    const prev = cell.spans[i - 1]
    if (prev && span.x - prev.xEnd > 0.15 * span.size) out += ' '
    out += span.text
  })
  return out.replace(/\s+/g, ' ').trim()
}

export function lineText(line: Line): string {
  return line.cells.map(cellText).join(' ')
}

/** Joins two wrapped lines, undoing end-of-line hyphenation. */
function join(a: string, b: string): string {
  return /\p{Ll}-$/u.test(a) && /^\p{Ll}/u.test(b) ? a.slice(0, -1) + b : `${a} ${b}`
}

/** The body text size (the one covering the most characters) and the larger sizes, biggest first. */
function fontSizes(pages: Page[]) {
  const chars = new Map<number, number>()
  for (const page of pages) {
    for (const line of page.lines) chars.set(line.size, (chars.get(line.size) ?? 0) + lineText(line).length)
  }
  const body = [...chars].reduce((a, b) => (b[1] > a[1] ? b : a), [0, 0])[0]
  const headings = [...chars.keys()].filter((size) => size > body * 1.15).sort((a, b) => b - a)
  return { body, headings }
}

const median = (values: number[]) => values.sort((a, b) => a - b)[values.length >> 1]
const width = (cell: Cell) => cell.xEnd - cell.x

/** Finds the x position of the gap between two text columns, if the page has one. */
function findGutter(page: Page): number | null {
  const cells = page.lines.flatMap((line) => line.cells)
  let best: { x: number; crossing: number } | null = null
  for (let x = page.width * 0.3; x <= page.width * 0.7; x += 2) {
    const left = cells.filter((cell) => cell.xEnd <= x)
    const right = cells.filter((cell) => cell.x >= x)
    const crossing = cells.length - left.length - right.length
    if (left.length < 5 || right.length < 5 || crossing > cells.length * 0.1) continue
    // Short cells on either side mean a table or label/value pairs, not two columns of prose.
    if (median(left.map(width)) < page.width * 0.25 || median(right.map(width)) < page.width * 0.25) continue
    if (!best || crossing < best.crossing) best = { x, crossing }
  }
  return best && best.x
}

/** Returns the page's lines in reading order: on two-column pages, the left column before the right. */
function readingOrder(page: Page): Line[] {
  const gutter = findGutter(page)
  if (gutter === null) return page.lines
  const out: Line[] = []
  let left: Line[] = []
  let right: Line[] = []
  for (const line of page.lines) {
    const l = line.cells.filter((cell) => cell.xEnd <= gutter)
    const r = line.cells.filter((cell) => cell.x >= gutter)
    if (l.length + r.length < line.cells.length) {
      // A full-width line, such as a title, ends the columns above it.
      out.push(...left, ...right, line)
      left = []
      right = []
    } else {
      if (l.length) left.push({ ...line, cells: l })
      if (r.length) right.push({ ...line, cells: r })
    }
  }
  return [...out, ...left, ...right]
}

/** Two lines are table rows if at least three of their cells line up horizontally. */
function aligned(a: Line, b: Line): boolean {
  if (a.cells.length < 3 || b.cells.length < 3) return false
  return a.cells.filter((c) => b.cells.some((d) => c.x < d.xEnd && d.x < c.xEnd)).length >= 3
}

function table(lines: Line[]): Block {
  const cols = lines.reduce((a, b) => (b.cells.length > a.cells.length ? b : a)).cells
  const rows = lines.map((line) => {
    const row = cols.map(() => '')
    for (const cell of line.cells) {
      const overlap = (col: Cell) => Math.min(cell.xEnd, col.xEnd) - Math.max(cell.x, col.x)
      const i = cols.reduce((best, col, j) => (overlap(col) > overlap(cols[best]) ? j : best), 0)
      row[i] = `${row[i]} ${cellText(cell)}`.trim()
    }
    return row
  })
  return { type: 'table', rows }
}

/** Turns positioned lines into headings, paragraphs, list items and tables. */
export function toBlocks(pages: Page[]): Block[] {
  const { body, headings } = fontSizes(pages)
  const blocks: Block[] = []
  for (const page of pages) {
    const lines = readingOrder(page)
    let prev: Line | undefined
    let itemX = 0
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      let end = i
      while (end + 1 < lines.length && aligned(lines[end], lines[end + 1])) end++
      if (end > i) {
        blocks.push(table(lines.slice(i, end + 1)))
        i = end
        prev = undefined
        continue
      }

      const text = lineText(line)
      const x = line.cells[0].x
      const last = blocks.at(-1)
      const gap = prev ? line.y - prev.y : -1
      // A negative gap means the text jumped to the next column or page.
      const near = prev !== undefined && gap > 0 && gap < 1.45 * Math.max(line.size, prev.size)
      // Sizes measured by OCR vary a little from line to line.
      const wraps = near && Math.abs(line.size - prev!.size) <= 0.1 * line.size
      const isHeading = line.size > body * 1.15 && text.length <= 150 && /\p{L}/u.test(text)
      const item = text.match(LIST_ITEM)

      if (isHeading) {
        const level = Math.min(headings.filter((size) => size > line.size).length + 1, 3)
        if (near && last?.type === 'heading' && last.level === level) last.text = join(last.text, text)
        else blocks.push({ type: 'heading', level, text })
      } else if (item) {
        blocks.push({ type: 'item', marker: /\w/.test(item[1]) ? item[1] : '-', text: item[2] })
        itemX = x
      } else if (
        // An indented line starts a new paragraph, but continues a list item.
        (wraps && last?.type === 'paragraph' && x - prev!.cells[0].x < 0.8 * line.size) ||
        (wraps && last?.type === 'item' && x > itemX + 1) ||
        // A sentence cut off by a column or page break carries on.
        (gap <= 0 && last?.type === 'paragraph' && !/[.!?:]\W*$/.test(last.text) && /^\p{Ll}/u.test(text))
      ) {
        last.text = join(last.text, text)
      } else {
        blocks.push({ type: 'paragraph', text })
      }
      prev = line
    }
  }
  return blocks
}
