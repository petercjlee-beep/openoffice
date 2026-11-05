import { describe, expect, it } from 'vitest'
import {
  GulEncodingError,
  UNICODE_CODEC,
  createKsCodec,
  editCells,
  visibleText,
} from '../src/index'
import type { GulCell } from '../src/index'

const cell = (code: number, kind = 5): GulCell => ({ aux: 0, kind, code })

describe('KS X 1001 codec', () => {
  const ks = createKsCodec()

  it('reads the two-byte code of a syllable and keeps ASCII', () => {
    expect(ks.decode(0xb0a1)).toBe('가')
    expect(ks.decode(0xc7d1)).toBe('한')
    expect(ks.decode(0x41)).toBe('A')
  })

  it('reads symbols and Hanja of the table', () => {
    expect(ks.decode(0xa1da)).toBe('★')
    expect(ks.decode(ks.encode('報'))).toBe('報')
  })

  it('writes back the code it read', () => {
    for (const ch of ['가', '힝', '△', '※', '報', '0', 'z']) {
      expect(ks.decode(ks.encode(ch))).toBe(ch)
    }
    expect(ks.encode('가')).toBe(0xb0a1)
  })

  it('refuses a character the old encoding cannot hold', () => {
    expect(() => ks.encode('😀'.charAt(0))).toThrow(GulEncodingError)
    expect(() => ks.encode('ᄀ')).toThrow(GulEncodingError)
    // outside the 2350 syllables of KS X 1001
    expect(() => ks.encode('힣')).toThrow(GulEncodingError)
  })

  it('keeps a code the table does not know as it was', () => {
    const stand = ks.decode(0xc9a1)
    const again = ks.decode(0xc9a1)
    expect(again).toBe(stand)
    expect(ks.encode(stand)).toBe(0xc9a1)
  })

  it('edits a line of old codes without touching the characters around the change', () => {
    const cells = [cell(0xb0a1), cell(0xb3aa), cell(0xb4d9), cell(0x0a)]
    expect(visibleText(cells, ks)).toBe('가나다')
    const next = editCells(cells, '가나다라', ks)
    expect(next.map((c) => c.code)).toEqual([0xb0a1, 0xb3aa, 0xb4d9, ks.encode('라'), 0x0a])
  })

  it('does not change anything when the text is not edited', () => {
    const cells = [cell(0xb0a1), cell(0x0a)]
    expect(editCells(cells, '가', ks)).toEqual(cells)
  })

  it('leaves the cells untouched when a typed character cannot be stored', () => {
    const cells = [cell(0xb0a1), cell(0x0a)]
    expect(() => editCells(cells, '가ᄀ', ks)).toThrow(GulEncodingError)
    expect(cells.map((c) => c.code)).toEqual([0xb0a1, 0x0a])
  })
})

describe('Unicode codec', () => {
  it('is the identity on UTF-16 units', () => {
    expect(UNICODE_CODEC.decode(0xac00)).toBe('가')
    expect(UNICODE_CODEC.encode('가')).toBe(0xac00)
  })
})
