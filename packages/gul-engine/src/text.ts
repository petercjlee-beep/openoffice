import { UNICODE_CODEC, type TextCodec } from './codec'
import { TYPE_TEXT, type GulRecord } from './records'

/**
 * Text lives in type-1 records whose body is a list of 8-byte character cells:
 *   aux u16 | kind u16 | code u16 | 0 u16
 * `kind` indexes the character attributes of the Attribute stream; `aux` is non-zero only on a
 * few marker cells. A record is one laid-out line: it ends with 0x0b (the line wraps) or 0x0a
 * (the paragraph ends). The other type-1 records, 28 bytes long, describe the line that follows.
 */

export const CELL_SIZE = 8
export const SOFT_BREAK = 0x0b
export const PARAGRAPH_END = 0x0a
export const TAB = 0x09

export interface GulCell {
  aux: number
  kind: number
  code: number
}

/** Attribute index used for text typed into a line that has no character to copy it from. */
export const DEFAULT_KIND = 24

export function isTextRecord(record: GulRecord): boolean {
  const body = record.body
  if (record.type !== TYPE_TEXT || body.length === 0 || body.length % CELL_SIZE !== 0) return false
  for (let at = 0; at < body.length; at += CELL_SIZE) {
    if (body[at + 6] !== 0 || body[at + 7] !== 0) return false
  }
  return true
}

export function cellsOf(record: GulRecord): GulCell[] {
  const body = record.body
  const cells: GulCell[] = []
  for (let at = 0; at < body.length; at += CELL_SIZE) {
    cells.push({
      aux: body[at]! | (body[at + 1]! << 8),
      kind: body[at + 2]! | (body[at + 3]! << 8),
      code: body[at + 4]! | (body[at + 5]! << 8),
    })
  }
  return cells
}

export function bodyOfCells(cells: readonly GulCell[]): Uint8Array {
  const body = new Uint8Array(cells.length * CELL_SIZE)
  cells.forEach((cell, index) => {
    const at = index * CELL_SIZE
    body[at] = cell.aux & 0xff
    body[at + 1] = (cell.aux >> 8) & 0xff
    body[at + 2] = cell.kind & 0xff
    body[at + 3] = (cell.kind >> 8) & 0xff
    body[at + 4] = cell.code & 0xff
    body[at + 5] = (cell.code >> 8) & 0xff
  })
  return body
}

/** A cell that shows as text: not a line or paragraph end, not a marker. Tabs count. */
export function isVisible(cell: GulCell): boolean {
  return cell.code >= 0x20 || cell.code === TAB
}

export function visibleText(cells: readonly GulCell[], codec: TextCodec = UNICODE_CODEC): string {
  let text = ''
  for (const cell of cells) if (isVisible(cell)) text += codec.decode(cell.code)
  return text
}

/**
 * Replace the part of a line that differs between its visible text and `next`. The common
 * start and end are kept as they are, so their attributes and every marker cell outside the
 * changed part survive; soft line breaks inside the changed part go, since the line no longer
 * wraps there. Typed characters take the attributes of the character before them.
 */
export function editCells(
  cells: readonly GulCell[],
  next: string,
  codec: TextCodec = UNICODE_CODEC,
): GulCell[] {
  const visible: number[] = []
  cells.forEach((cell, index) => {
    if (isVisible(cell)) visible.push(index)
  })
  const old = visible.map((index) => codec.decode(cells[index]!.code))
  let start = 0
  while (start < old.length && start < next.length && old[start] === next[start]) {
    start += 1
  }
  let endOld = old.length
  let endNew = next.length
  while (endOld > start && endNew > start && old[endOld - 1] === next[endNew - 1]) {
    endOld -= 1
    endNew -= 1
  }
  if (start === endOld && start === endNew) return cells.slice()

  let from: number
  if (start < visible.length) from = visible[start]!
  else if (visible.length > 0) from = visible[visible.length - 1]! + 1
  else {
    // nothing visible yet: type in front of the cell that ends the line
    const end = cells.findIndex((cell) => cell.code === SOFT_BREAK || cell.code === PARAGRAPH_END)
    from = end >= 0 ? end : cells.length
  }
  const to = endOld > start ? visible[endOld - 1]! + 1 : from
  const donor =
    start > 0 ? cells[visible[start - 1]!]! : visible.length > 0 ? cells[visible[0]!]! : undefined
  const kind = donor?.kind ?? DEFAULT_KIND
  const typed: GulCell[] = []
  // a same-length replacement keeps the attributes of the characters it replaces
  const sameLength = endOld - start === endNew - start
  for (let i = start; i < endNew; i += 1) {
    const replaced = sameLength ? cells[visible[i]!] : undefined
    typed.push({
      aux: replaced?.aux ?? 0,
      kind: replaced?.kind ?? kind,
      code: codec.encode(next[i]!),
    })
  }

  const kept: GulCell[] = []
  for (let i = from; i < to; i += 1) {
    const cell = cells[i]!
    if (!isVisible(cell) && cell.code !== SOFT_BREAK) kept.push(cell)
  }
  return [...cells.slice(0, from), ...typed, ...kept, ...cells.slice(to)]
}
