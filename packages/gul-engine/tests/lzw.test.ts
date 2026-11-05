import { describe, expect, it } from 'vitest'
import { lzwDecode, lzwEncode } from '../src/index'

function pseudo(length: number, alphabet: number, seed: number): Uint8Array {
  const out = new Uint8Array(length)
  let state = seed
  for (let i = 0; i < length; i += 1) {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    out[i] = state % alphabet
  }
  return out
}

describe('gul LZW', () => {
  it('round-trips small and empty inputs', () => {
    expect(lzwDecode(lzwEncode(new Uint8Array(0)))).toEqual(new Uint8Array(0))
    for (const text of [
      'a',
      'ab',
      'aaaa',
      'abababababab',
      'the quick brown fox the quick brown fox',
    ]) {
      const data = new TextEncoder().encode(text)
      expect(lzwDecode(lzwEncode(data))).toEqual(data)
    }
  })

  it('round-trips data that widens the codes and fills the dictionary', () => {
    for (const [length, alphabet] of [
      [5000, 4],
      [70000, 256],
      [400000, 3],
      [300000, 40],
    ] as const) {
      const data = pseudo(length, alphabet, length)
      expect(lzwDecode(lzwEncode(data))).toEqual(data)
    }
  })

  it('reads a stream written by the original program', () => {
    // the 11-byte "Anchored Frame" stream of an empty page: seventeen bytes once unpacked
    const packed = Uint8Array.from([
      0x00, 0x00, 0x08, 0x88, 0x40, 0x20, 0xa0, 0xc1, 0x83, 0x06, 0x01,
    ])
    const unpacked = lzwDecode(packed)
    expect(unpacked.length).toBe(17)
    expect(Array.from(unpacked.subarray(0, 5))).toEqual([0, 0, 2, 0x11, 4])
  })
})
