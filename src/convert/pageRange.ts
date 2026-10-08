/** Parses a page selection such as "1-5, 8, 12-" into sorted page numbers. An empty selection means all pages. */
export function parsePageRange(input: string, pageCount: number): number[] {
  const parts = input.split(',').map((part) => part.trim()).filter(Boolean)
  if (!parts.length) return Array.from({ length: pageCount }, (_, i) => i + 1)
  const pages = new Set<number>()
  for (const part of parts) {
    const match = part.match(/^(\d+)?\s*(-)?\s*(\d+)?$/)
    if (!match || (!match[1] && !match[3])) throw new Error(`"${part}" is not a page number or range`)
    const from = match[1] ? Number(match[1]) : 1
    const to = match[3] ? Number(match[3]) : match[2] ? pageCount : from
    if (from < 1 || from > to) throw new Error(`"${part}" is not a valid range`)
    for (let n = from; n <= Math.min(to, pageCount); n++) pages.add(n)
  }
  if (!pages.size) {
    throw new Error(`No pages match "${input.trim()}": the PDF has ${pageCount} page${pageCount === 1 ? '' : 's'}`)
  }
  return [...pages].sort((a, b) => a - b)
}
