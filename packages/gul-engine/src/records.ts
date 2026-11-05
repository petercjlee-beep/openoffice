/**
 * The records inside a decompressed page or frame stream.
 *
 * Every record is a 13-byte header followed by its body:
 *   id u16 | type u8 | level u8 | 0x11 | length u32 | extra u32 | body[length]
 * A stream starts with a head (`00 00 <kind> 11`, a u32 length, 4 more bytes, then that many bytes)
 * that is kept as opaque bytes. After the last record every stream seen so far carries one more
 * byte, kept as the tail.
 */

export const RECORD_HEADER = 13
const MARKER = 0x11

export class GulRecordError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GulRecordError'
  }
}

export interface GulRecord {
  id: number
  type: number
  level: number
  extra: number
  body: Uint8Array
}

export interface GulRecordStream {
  head: Uint8Array
  records: GulRecord[]
  tail: Uint8Array
}

/** Record type of a paragraph's character cells (and of the small paragraph descriptors). */
export const TYPE_TEXT = 1

function u32(data: Uint8Array, at: number): number {
  return (data[at]! | (data[at + 1]! << 8) | (data[at + 2]! << 16) | (data[at + 3]! << 24)) >>> 0
}

function walk(data: Uint8Array, start: number): { records: GulRecord[]; end: number } | null {
  const records: GulRecord[] = []
  let at = start
  while (at + RECORD_HEADER <= data.length && data[at + 4] === MARKER) {
    const length = u32(data, at + 5)
    const end = at + RECORD_HEADER + length
    if (end > data.length) return null
    records.push({
      id: data[at]! | (data[at + 1]! << 8),
      type: data[at + 2]!,
      level: data[at + 3]!,
      extra: u32(data, at + 9),
      body: data.subarray(at + RECORD_HEADER, end),
    })
    at = end
  }
  return { records, end: at }
}

/** Split a decompressed stream into its head, records and tail; null when it does not fit. */
export function parseRecordStream(data: Uint8Array): GulRecordStream | null {
  const candidates: number[] = []
  // a stream head: 00 00 <kind> 11 <length> ...; the records follow 12 bytes plus that length.
  // Pages start 00 00 00 11, frame lists 00 00 02 11. A record stream without a head starts
  // with an ordinary record, whose marker byte sits at offset 4 instead of 3.
  if (data.length >= 12 && data[3] === MARKER) candidates.push(12 + u32(data, 4))
  candidates.push(0)
  for (const start of candidates) {
    if (start > data.length) continue
    const walked = walk(data, start)
    if (!walked) continue
    if (walked.records.length === 0 && start === 0) continue
    // whatever is left is the tail; real streams leave exactly one byte
    if (data.length - walked.end > 16) continue
    return {
      head: data.subarray(0, start),
      records: walked.records,
      tail: data.subarray(walked.end),
    }
  }
  return null
}

function byteSum(data: Uint8Array): number {
  let sum = 0
  for (let i = 0; i < data.length; i += 1) sum += data[i]!
  return sum
}

/**
 * Restore the check values the program verifies on reading: the id of every record is the low byte
 * is the byte sum of the body before it, the first id sums the payload of the stream head, and
 * the byte after the last record sums the last body (low 8 bits). Call it after changing a body.
 */
export function refreshChecks(stream: GulRecordStream): void {
  const { records } = stream
  records.forEach((record, i) => {
    let sum = -1
    if (i > 0) sum = byteSum(records[i - 1]!.body)
    else if (stream.head.length > 12) sum = byteSum(stream.head.subarray(12))
    // only the low byte of the id is the check; the high byte is a separate value to keep
    if (sum >= 0) record.id = (record.id & 0xff00) | (sum & 0xff)
  })
  const last = records[records.length - 1]
  if (last && stream.tail.length === 1) stream.tail = Uint8Array.of(byteSum(last.body) & 0xff)
}

export function serializeRecordStream(stream: GulRecordStream): Uint8Array {
  let size = stream.head.length + stream.tail.length
  for (const record of stream.records) size += RECORD_HEADER + record.body.length
  const out = new Uint8Array(size)
  out.set(stream.head, 0)
  let at = stream.head.length
  for (const record of stream.records) {
    out[at] = record.id & 0xff
    out[at + 1] = (record.id >> 8) & 0xff
    out[at + 2] = record.type
    out[at + 3] = record.level
    out[at + 4] = MARKER
    const length = record.body.length
    out[at + 5] = length & 0xff
    out[at + 6] = (length >>> 8) & 0xff
    out[at + 7] = (length >>> 16) & 0xff
    out[at + 8] = (length >>> 24) & 0xff
    out[at + 9] = record.extra & 0xff
    out[at + 10] = (record.extra >>> 8) & 0xff
    out[at + 11] = (record.extra >>> 16) & 0xff
    out[at + 12] = (record.extra >>> 24) & 0xff
    out.set(record.body, at + RECORD_HEADER)
    at += RECORD_HEADER + length
  }
  out.set(stream.tail, at)
  return out
}
