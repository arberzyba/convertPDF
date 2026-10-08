/** A run of text in one font. Coordinates are in PDF points, measured from the top-left of the page. */
export interface Span {
  text: string
  x: number
  xEnd: number
  /** Baseline position. */
  y: number
  size: number
}

/** Spans on one line with no wide gap between them: a table cell, or one column's part of a line. */
export interface Cell {
  x: number
  xEnd: number
  spans: Span[]
}

export interface Line {
  y: number
  size: number
  cells: Cell[]
}

export interface Page {
  width: number
  height: number
  lines: Line[]
  /** Set for scanned pages, which have no positioned text. */
  ocrText?: string
}

export type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'item'; marker: string; text: string }
  | { type: 'table'; rows: string[][] }

export type Format = 'markdown' | 'text'
