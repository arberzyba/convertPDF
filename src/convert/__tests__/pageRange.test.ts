import { expect, test } from 'vitest'
import { parsePageRange } from '../pageRange'
import { estimatePdfTokens, estimateTokens } from '../tokens'

test('an empty selection means all pages', () => {
  expect(parsePageRange('  ', 3)).toEqual([1, 2, 3])
})

test('parses pages, ranges and open-ended ranges', () => {
  expect(parsePageRange('8, 1-3, 12-', 14)).toEqual([1, 2, 3, 8, 12, 13, 14])
  expect(parsePageRange('-2', 5)).toEqual([1, 2])
  expect(parsePageRange('2-4, 3', 5)).toEqual([2, 3, 4])
})

test('clamps ranges to the page count', () => {
  expect(parsePageRange('3-99', 5)).toEqual([3, 4, 5])
})

test('rejects invalid input', () => {
  expect(() => parsePageRange('abc', 5)).toThrow('not a page number or range')
  expect(() => parsePageRange('-', 5)).toThrow('not a page number or range')
  expect(() => parsePageRange('5-2', 5)).toThrow('not a valid range')
  expect(() => parsePageRange('0', 5)).toThrow('not a valid range')
  expect(() => parsePageRange('9', 5)).toThrow('the PDF has 5 pages')
})

test('estimates tokens', () => {
  expect(estimateTokens('abcdefghi')).toBe(3)
  expect(estimatePdfTokens(100, 2)).toBe(3100)
})
