/**
 * How a 16-bit character code of a text cell maps to the text the person sees.
 *
 * Documents written by Hunminjeongeum 9.x store UTF-16 code units. Older ones (5.00) store the
 * KS X 1001 two-byte code (high byte first, e.g. 0xB0A1 for 가) and plain ASCII below 0x80.
 * Reading the old codes as Unicode shows garbage, and writing Unicode into such a document
 * corrupts it, so the engine picks the codec from the document version.
 */

export class GulEncodingError extends Error {
  constructor(public readonly char: string) {
    super(`the character U+${char.charCodeAt(0).toString(16).toUpperCase()} cannot be stored`)
    this.name = 'GulEncodingError'
  }
}

export interface TextCodec {
  /** One UTF-16 unit that stands for the stored code */
  decode(code: number): string
  /** The stored code of one UTF-16 unit; throws `GulEncodingError` when the document cannot hold it */
  encode(char: string): number
}

export const UNICODE_CODEC: TextCodec = {
  decode: (code) => String.fromCharCode(code),
  encode: (char) => char.charCodeAt(0),
}

const PRIVATE_USE_START = 0xe000
const PRIVATE_USE_END = 0xf8ff

/**
 * The KS X 1001 (Windows code page 949) codec of the old documents. Codes the table does not
 * know (user-defined characters) are given a private-use stand-in for this document, so that
 * they survive an edit of the text around them unchanged.
 */
export function createKsCodec(): TextCodec {
  const forward = new Map<number, string>()
  const backward = new Map<string, number>()
  const decoder = new TextDecoder('euc-kr')
  // only the KS X 1001 table (both bytes 0xA1-0xFE); the wider code page 949 extension is not
  // known to be understood by the old versions, and runtimes differ in whether they decode it
  for (let high = 0xa1; high <= 0xfe; high += 1) {
    for (let low = 0xa1; low <= 0xfe; low += 1) {
      const text = decoder.decode(new Uint8Array([high, low]))
      if (text.length !== 1 || text === '�') continue
      const code = (high << 8) | low
      forward.set(code, text)
      if (!backward.has(text)) backward.set(text, code)
    }
  }
  let nextStandIn = PRIVATE_USE_START
  const standIn = (code: number): string => {
    let text = forward.get(code)
    if (text === undefined) {
      if (nextStandIn > PRIVATE_USE_END) return '�'
      text = String.fromCharCode(nextStandIn)
      nextStandIn += 1
      forward.set(code, text)
      backward.set(text, code)
    }
    return text
  }
  return {
    decode: (code) => (code < 0x80 ? String.fromCharCode(code) : standIn(code)),
    encode: (char) => {
      const unit = char.charCodeAt(0)
      if (unit < 0x80) return unit
      const code = backward.get(char)
      if (code === undefined) throw new GulEncodingError(char)
      return code
    },
  }
}
