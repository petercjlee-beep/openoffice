/**
 * The stream compression of Hunminjeongeum (.gul) documents.
 *
 * It is a variable-width LZW: codes are packed least-significant-bit first, start at 9 bits and
 * grow to at most 16, 256 is the clear code and the first dictionary entry is 257. The rules
 * below follow the reader of the original program (CHunFile::ZD_Read in HSTORAGE.DLL), so any
 * stream written here is read the same way by it. The program can also XOR the output with a
 * repeating key; documents without a password use no key, so none is applied here.
 */

export const CLEAR_CODE = 256
export const FIRST_ENTRY = 257
export const MIN_BITS = 9
export const MAX_BITS = 16
const TABLE_TOP = (1 << MAX_BITS) - 1

export class GulCompressionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GulCompressionError'
  }
}

/** Bookkeeping the reader does after it adds an entry, shared so the writer can mirror it. */
class WidthState {
  width = MIN_BITS
  mask = (1 << MIN_BITS) - 1
  free = FIRST_ENTRY
  full = false

  reset(): void {
    this.width = MIN_BITS
    this.mask = (1 << MIN_BITS) - 1
    this.free = FIRST_ENTRY
    this.full = false
  }

  /** The reader added entry `free`: move on, widening the codes when the mask is reached. */
  added(): void {
    const index = this.free
    this.free += 1
    if (index !== this.mask) return
    if (this.mask >= TABLE_TOP) {
      this.free -= 1
      this.full = true
    } else {
      this.width += 1
      this.mask = this.mask * 2 + 1
    }
  }
}

export function lzwDecode(data: Uint8Array): Uint8Array {
  const totalBits = data.length * 8
  let position = 0
  const read = (width: number): number => {
    if (position + width > totalBits) return -1
    let value = 0
    for (let i = 0; i < width; i += 1) {
      const bit = position + i
      value |= ((data[bit >> 3]! >> (bit & 7)) & 1) << i
    }
    position += width
    return value
  }

  const prefix = new Uint16Array(TABLE_TOP + 1)
  const suffix = new Uint8Array(TABLE_TOP + 1)
  const out: number[] = []
  const state = new WidthState()
  let previous = read(state.width)
  if (previous < 0) return new Uint8Array(0)
  if (previous > 255) throw new GulCompressionError('stream does not start with a literal')
  let first = previous & 0xff
  out.push(first)

  for (;;) {
    const code = read(state.width)
    if (code < 0) break
    if (code === CLEAR_CODE) {
      state.reset()
      previous = read(state.width)
      if (previous < 0) break
      first = previous & 0xff
      out.push(first)
      continue
    }
    const stack: number[] = []
    let current = code
    if (current >= state.free && !state.full) {
      if (current !== state.free) throw new GulCompressionError(`bad code ${current}`)
      current = previous
      stack.push(first)
    }
    while (current >= 256) {
      stack.push(suffix[current]!)
      current = prefix[current]!
    }
    first = current & 0xff
    out.push(first)
    for (let i = stack.length - 1; i >= 0; i -= 1) out.push(stack[i]!)
    if (!state.full) {
      prefix[state.free] = previous
      suffix[state.free] = first
      state.added()
    }
    previous = code
  }
  return Uint8Array.from(out)
}

export function lzwEncode(data: Uint8Array): Uint8Array {
  const bytes: number[] = []
  let accumulator = 0
  let accumulated = 0
  const write = (value: number, width: number): void => {
    accumulator |= value << accumulated
    accumulated += width
    while (accumulated >= 8) {
      bytes.push(accumulator & 0xff)
      accumulator >>>= 8
      accumulated -= 8
    }
  }

  if (data.length === 0) return new Uint8Array(0)
  const state = new WidthState()
  let table = new Map<number, number>()
  let nextEntry = FIRST_ENTRY
  let emitted = 0
  const emit = (code: number): void => {
    write(code, state.width)
    emitted += 1
    // the reader adds an entry for every code after the first one it reads after a clear code
    if (emitted >= 2 && !state.full) state.added()
  }

  let phrase = data[0]!
  for (let i = 1; i < data.length; i += 1) {
    const byte = data[i]!
    const key = phrase * 256 + byte
    const known = table.get(key)
    if (known !== undefined) {
      phrase = known
      continue
    }
    emit(phrase)
    if (nextEntry <= TABLE_TOP) {
      table.set(key, nextEntry)
      nextEntry += 1
    } else {
      // the dictionary is full: start over, as the reader does at a clear code
      write(CLEAR_CODE, state.width)
      state.reset()
      table = new Map()
      nextEntry = FIRST_ENTRY
      emitted = 0
    }
    phrase = byte
  }
  emit(phrase)
  if (accumulated > 0) bytes.push(accumulator & 0xff)
  return Uint8Array.from(bytes)
}
