import { describe, expect, it } from 'vitest'
import {
  editCells,
  editLines,
  parseRecordStream,
  serializeRecordStream,
  visibleText,
  type GulCell,
} from '../src/index'

function line(text: string, end: number, kind = 24): GulCell[] {
  return [...text]
    .map((ch) => ({ aux: 0, kind, code: ch.charCodeAt(0) }))
    .concat({ aux: 0, kind, code: end })
}

describe('editCells', () => {
  it('leaves an unchanged line alone', () => {
    const cells = line('안녕하세요', 0x0a)
    expect(editCells(cells, '안녕하세요')).toEqual(cells)
  })

  it('types before the paragraph end, with the attributes of the character before', () => {
    const cells = [...line('가나', 0x0a)]
    cells[1] = { ...cells[1]!, kind: 7 }
    const next = editCells(cells, '가나다')
    expect(visibleText(next)).toBe('가나다')
    expect(next.map((c) => c.code)).toEqual(
      [...'가나다'].map((ch) => ch.charCodeAt(0)).concat(0x0a),
    )
    expect(next[2]!.kind).toBe(7)
    expect(next[3]!.code).toBe(0x0a)
  })

  it('replaces a middle part and keeps both sides as they were', () => {
    const cells = line('abcdef', 0x0b)
    cells[0] = { ...cells[0]!, kind: 3 }
    const next = editCells(cells, 'abXYef')
    expect(visibleText(next)).toBe('abXYef')
    expect(next[0]!.kind).toBe(3)
    expect(next.at(-1)!.code).toBe(0x0b)
  })

  it('drops a soft line break inside the changed part but not outside it', () => {
    const cells = [...line('ab', 0x0b)]
    cells.splice(1, 0, { aux: 0, kind: 24, code: 0x0b })
    expect(editCells(cells, 'X').map((c) => c.code)).toEqual(['X'.charCodeAt(0), 0x0b])
    const tail = [...line('abc', 0x0b)]
    expect(editCells(tail, 'abcd').at(-1)!.code).toBe(0x0b)
  })

  it('types into an empty paragraph in front of its end cell', () => {
    const next = editCells(line('', 0x0a), '새 글')
    expect(visibleText(next)).toBe('새 글')
    expect(next.at(-1)!.code).toBe(0x0a)
  })

  it('deletes text', () => {
    expect(visibleText(editCells(line('abc', 0x0a), 'ac'))).toBe('ac')
    expect(visibleText(editCells(line('abc', 0x0a), ''))).toBe('')
  })
})

describe('editLines', () => {
  const lines = () => [line('hello ', 0x0b), line('world', 0x0a)]

  it('edits inside the second line', () => {
    const next = editLines(lines(), 'hello there')
    expect(next.map((cells) => visibleText(cells))).toEqual(['hello ', 'there'])
  })

  it('removes text that spans a line break', () => {
    const next = editLines(lines(), 'held')
    expect(next.map((cells) => visibleText(cells)).join('')).toBe('held')
    expect(next[1]!.at(-1)!.code).toBe(0x0a)
  })

  it('keeps untouched lines when two separate changes are made', () => {
    const three = [line('aa bo ', 0x0b), line('middle text ', 0x0b), line('end bo', 0x0a)]
    const next = editLines(three, 'aa XX middle text end XX')
    expect(next.map((cells) => visibleText(cells))).toEqual(['aa XX ', 'middle text ', 'end XX'])
    expect(next.map((cells) => cells.length)).toEqual(three.map((cells) => cells.length))
  })

  it('appends to the last line', () => {
    expect(editLines(lines(), 'hello world!').map((cells) => visibleText(cells))).toEqual([
      'hello ',
      'world!',
    ])
  })
})

describe('record streams', () => {
  function stream(): Uint8Array {
    const body = Uint8Array.from([1, 2, 3, 4])
    const record = (id: number): number[] => [id, 0, 1, 1, 0x11, 4, 0, 0, 0, 0, 0, 0, 0, ...body]
    return Uint8Array.from([
      0,
      0,
      0,
      0x11,
      2,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      9,
      9,
      ...record(5),
      ...record(6),
      0,
    ])
  }

  it('splits head, records and tail and writes them back identically', () => {
    const data = stream()
    const parsed = parseRecordStream(data)!
    expect(parsed.head.length).toBe(14)
    expect(parsed.records.map((r) => r.id)).toEqual([5, 6])
    expect(parsed.tail.length).toBe(1)
    expect(serializeRecordStream(parsed)).toEqual(data)
  })

  it('refuses bytes that are not a record stream', () => {
    expect(
      parseRecordStream(
        Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]),
      ),
    ).toBeNull()
  })
})
