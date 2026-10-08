import { expect, test } from 'vitest'
import { buildLines, toBlocks } from '../layout'
import { render } from '../render'
import type { Format, Span } from '../types'

const span = (text: string, x: number, y: number, size = 10): Span => ({
  text,
  x,
  xEnd: x + text.length * size * 0.5,
  y,
  size,
})

const convert = (spans: Span[], format: Format = 'markdown') =>
  render(toBlocks([{ width: 600, height: 800, lines: buildLines(spans) }]), format)

test('larger text becomes a heading and wrapped lines merge into paragraphs', () => {
  const spans = [
    span('Title', 50, 50, 20),
    span('This is a para-', 50, 100),
    span('graph of text.', 50, 112),
    span('Second paragraph.', 50, 140),
  ]
  expect(convert(spans)).toBe('# Title\n\nThis is a paragraph of text.\n\nSecond paragraph.')
  expect(convert(spans, 'text')).toBe('Title\n\nThis is a paragraph of text.\n\nSecond paragraph.')
})

test('widely spaced lines still merge when that is the document’s normal line spacing', () => {
  const spans = [
    span('A double-spaced', 50, 100),
    span('paragraph of text.', 50, 124),
    span('It carries on', 50, 148),
    span('for a while.', 50, 172),
    span('Next paragraph.', 50, 220),
  ]
  expect(convert(spans)).toBe('A double-spaced paragraph of text. It carries on for a while.\n\nNext paragraph.')
})

test('an indented first line starts a new paragraph', () => {
  const spans = [span('End of the first one.', 50, 100), span('Start of the next', 65, 112), span('which wraps.', 50, 124)]
  expect(convert(spans)).toBe('End of the first one.\n\nStart of the next which wraps.')
})

test('bullets and numbers become list items, with wrapped lines attached', () => {
  const spans = [
    span('• First item that', 50, 100),
    span('wraps', 60, 112),
    span('• Second', 50, 124),
    span('1. Third', 50, 136),
  ]
  expect(convert(spans)).toBe('- First item that wraps\n- Second\n1. Third')
})

test('aligned cells become a table', () => {
  const spans = [
    span('Name', 50, 100),
    span('Qty', 200, 100),
    span('Price', 350, 100),
    span('Apple', 50, 112),
    span('3', 200, 112),
    span('1.20', 350, 112),
  ]
  expect(convert(spans)).toBe('| Name | Qty | Price |\n| --- | --- | --- |\n| Apple | 3 | 1.20 |')
  expect(convert(spans, 'text')).toBe('Name\tQty\tPrice\nApple\t3\t1.20')
})

test('two-column pages read the left column before the right', () => {
  const spans = [0, 1, 2, 3, 4, 5].flatMap((i) => [
    span(`left ${i} `.padEnd(40, 'x'), 50, 100 + i * 12),
    span(`right ${i} `.padEnd(40, 'x'), 320, 100 + i * 12),
  ])
  const out = convert(spans)
  expect(out.indexOf('left 5')).toBeLessThan(out.indexOf('right 0'))
})
