import type { Block, Format } from './types'

function renderBlock(block: Block, markdown: boolean): string {
  switch (block.type) {
    case 'heading':
      return markdown ? `${'#'.repeat(block.level)} ${block.text}` : block.text
    case 'paragraph':
      return block.text
    case 'item':
      return `${block.marker} ${block.text}`
    case 'table': {
      if (!markdown) return block.rows.map((row) => row.join('\t')).join('\n')
      const row = (cells: string[]) => `| ${cells.map((cell) => cell.replaceAll('|', '\\|')).join(' | ')} |`
      const [head, ...body] = block.rows
      return [row(head), row(head.map(() => '---')), ...body.map(row)].join('\n')
    }
  }
}

export function render(blocks: Block[], format: Format): string {
  return blocks
    .map((block, i) => {
      const sep = i === 0 ? '' : block.type === 'item' && blocks[i - 1].type === 'item' ? '\n' : '\n\n'
      return sep + renderBlock(block, format === 'markdown')
    })
    .join('')
}
