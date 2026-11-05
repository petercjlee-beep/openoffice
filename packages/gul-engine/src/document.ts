import { UNICODE_CODEC, createKsCodec, type TextCodec } from './codec'
import { CompoundFile } from './compound'
import { GulCompressionError, lzwDecode, lzwEncode } from './lzw'
import {
  parseRecordStream,
  refreshChecks,
  serializeRecordStream,
  type GulRecord,
  type GulRecordStream,
} from './records'
import {
  SOFT_BREAK,
  bodyOfCells,
  cellsOf,
  editCells,
  isTextRecord,
  visibleText,
  type GulCell,
} from './text'

const CONTENTS = 'Contents'
const SIGNATURE = 'SAMSUNG'

export type GulEncoding = 'unicode' | 'ks'

/**
 * The character encoding follows from the version in the Contents header ("9.01 Document
 * File"). Only the versions seen in real files are accepted; for any other the stored codes
 * could be read wrongly and written back worse, so the document does not open.
 */
function encodingOf(contents: Uint8Array | null | undefined): GulEncoding {
  const head = contents ? String.fromCharCode(...contents.slice(0, 64)) : ''
  const version = /(\d+)\.(\d+) Document File/.exec(head)
  const major = version ? Number(version[1]) : NaN
  if (major === 5) return 'ks'
  if (major >= 9) return 'unicode'
  throw new GulFormatError(`unsupported document version ${version?.[0] ?? '(unknown)'}`)
}

export class GulFormatError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GulFormatError'
  }
}

export type GulPartKind = 'body' | 'master' | 'web' | 'frame' | 'masterFrame'

/** One compressed record stream of the container: a page, a master page or a frame list. */
interface GulPart {
  name: string
  kind: GulPartKind
  /** page number for the page kinds, 0 otherwise; orders the body */
  number: number
  stream: GulRecordStream
  dirty: boolean
}

export interface GulParagraph {
  /** Position in the list `paragraphs()` returned; valid until the document is saved */
  index: number
  part: string
  kind: GulPartKind
  /** The visible text of all its lines, without line and paragraph ends */
  text: string
  /** How many laid-out lines (records) the paragraph spans */
  lines: number
}

interface ParagraphRef {
  part: GulPart
  records: number[]
}

function partKindOf(name: string): { kind: GulPartKind; number: number } | null {
  const page = /^(Master|Web)?PAGE(\d+)$/.exec(name)
  if (page) {
    const kind = page[1] === 'Master' ? 'master' : page[1] === 'Web' ? 'web' : 'body'
    return { kind, number: Number(page[2]) }
  }
  if (name === 'Anchored Frame') return { kind: 'frame', number: 0 }
  if (name === 'Master Anchored Frame') return { kind: 'masterFrame', number: 0 }
  return null
}

const KIND_ORDER: GulPartKind[] = ['body', 'frame', 'master', 'masterFrame', 'web']

export interface ParagraphOptions {
  /** Which parts to list; the body pages and the frames (tables, boxes) by default */
  kinds?: readonly GulPartKind[]
}

export class GulDocument {
  private constructor(
    private readonly container: CompoundFile,
    private readonly parts: GulPart[],
    private readonly codec: TextCodec,
    /** How the document stores its characters: UTF-16 (9.x) or KS X 1001 (5.00) */
    readonly encoding: GulEncoding,
  ) {}

  /** True when the bytes look like a .gul container (an OLE file whose Contents says SAMSUNG). */
  static isGul(file: Uint8Array): boolean {
    if (!CompoundFile.isCompound(file)) return false
    try {
      const head = CompoundFile.read(file).find(CONTENTS)?.data
      return (
        head !== undefined &&
        head !== null &&
        head.length >= SIGNATURE.length &&
        [...SIGNATURE].every((ch, i) => head[i] === ch.charCodeAt(0))
      )
    } catch {
      return false
    }
  }

  static open(file: Uint8Array): GulDocument {
    if (!GulDocument.isGul(file)) throw new GulFormatError('not a Hunminjeongeum (.gul) document')
    const container = CompoundFile.read(file)
    const encoding = encodingOf(container.find(CONTENTS)?.data)
    const parts: GulPart[] = []
    for (const entry of container.entries) {
      if (entry.type !== 2 || !entry.data) continue
      const info = partKindOf(entry.name)
      if (!info) continue
      let stream: GulRecordStream | null
      try {
        stream = parseRecordStream(lzwDecode(entry.data))
      } catch (error) {
        if (error instanceof GulCompressionError) {
          throw new GulFormatError(`stream ${entry.name} cannot be decompressed (password?)`)
        }
        throw error
      }
      if (!stream) throw new GulFormatError(`stream ${entry.name} has an unknown layout`)
      parts.push({ name: entry.name, ...info, stream, dirty: false })
    }
    parts.sort(
      (a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.number - b.number,
    )
    return new GulDocument(
      container,
      parts,
      encoding === 'ks' ? createKsCodec() : UNICODE_CODEC,
      encoding,
    )
  }

  /** The paragraphs in reading order. Editing keeps the order and the indexes. */
  paragraphs(options: ParagraphOptions = {}): GulParagraph[] {
    return this.refs(options).map((ref, index) => this.describe(ref, index))
  }

  text(options: ParagraphOptions = {}): string {
    return this.paragraphs(options)
      .map((paragraph) => paragraph.text)
      .join('\n')
  }

  /** Replace the text of one paragraph. Unchanged stretches keep their character attributes. */
  setParagraphText(index: number, text: string, options: ParagraphOptions = {}): void {
    const ref = this.refs(options)[index]
    if (!ref) throw new RangeError(`no paragraph ${index}`)
    const lines = ref.records.map((at) => cellsOf(ref.part.stream.records[at]!))
    const next = editLines(lines, text, this.codec)
    let changed = false
    next.forEach((cells, i) => {
      const record = ref.part.stream.records[ref.records[i]!]!
      const body = bodyOfCells(cells)
      if (sameBytes(body, record.body)) return
      record.body = body
      changed = true
    })
    if (changed) ref.part.dirty = true
  }

  /** Replace every occurrence of `find` inside a paragraph; returns how many were replaced. */
  replaceText(find: string, replacement: string, options: ParagraphOptions = {}): number {
    if (find === '') return 0
    let count = 0
    this.paragraphs(options).forEach((paragraph, index) => {
      const pieces = paragraph.text.split(find)
      if (pieces.length < 2) return
      count += pieces.length - 1
      this.setParagraphText(index, pieces.join(replacement), options)
    })
    return count
  }

  /** The document as .gul bytes. Streams nobody edited are written back exactly as read. */
  save(): Uint8Array {
    for (const part of this.parts) {
      if (!part.dirty) continue
      refreshChecks(part.stream)
      const packed = lzwEncode(serializeRecordStream(part.stream))
      this.container.setStream(part.name, packed)
      part.dirty = false
    }
    return this.container.write()
  }

  private refs(options: ParagraphOptions): ParagraphRef[] {
    const kinds = options.kinds ?? (['body', 'frame'] as const)
    const refs: ParagraphRef[] = []
    for (const part of this.parts) {
      if (!kinds.includes(part.kind)) continue
      let open: number[] = []
      part.stream.records.forEach((record: GulRecord, at) => {
        if (!isTextRecord(record)) return
        open.push(at)
        const cells = cellsOf(record)
        const last = cells[cells.length - 1]!.code
        if (last !== SOFT_BREAK) {
          refs.push({ part, records: open })
          open = []
        }
      })
      if (open.length > 0) refs.push({ part, records: open })
    }
    return refs
  }

  private describe(ref: ParagraphRef, index: number): GulParagraph {
    const text = ref.records
      .map((at) => visibleText(cellsOf(ref.part.stream.records[at]!), this.codec))
      .join('')
    return {
      index,
      part: ref.part.name,
      kind: ref.part.kind,
      text,
      lines: ref.records.length,
    }
  }
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false
  return true
}

interface Hunk {
  /** range [from, to) of the old text that is replaced */
  from: number
  to: number
  text: string
}

/** The separate changes between two texts, found with a longest common subsequence. */
export function diffHunks(old: string, next: string): Hunk[] {
  let start = 0
  while (start < old.length && start < next.length && old[start] === next[start]) start += 1
  let endOld = old.length
  let endNew = next.length
  while (endOld > start && endNew > start && old[endOld - 1] === next[endNew - 1]) {
    endOld -= 1
    endNew -= 1
  }
  if (start === endOld && start === endNew) return []
  const n = endOld - start
  const m = endNew - start
  // too large for the table: one change covering the whole differing middle
  if (n * m > 4_000_000) return [{ from: start, to: endOld, text: next.slice(start, endNew) }]
  const width = m + 1
  const table = new Uint32Array((n + 1) * width)
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      table[i * width + j] =
        old[start + i] === next[start + j]
          ? table[(i + 1) * width + j + 1]! + 1
          : Math.max(table[(i + 1) * width + j]!, table[i * width + j + 1]!)
    }
  }
  const hunks: Hunk[] = []
  let i = 0
  let j = 0
  let open: Hunk | null = null
  const close = (): void => {
    if (open) hunks.push(open)
    open = null
  }
  while (i < n || j < m) {
    if (i < n && j < m && old[start + i] === next[start + j]) {
      close()
      i += 1
      j += 1
      continue
    }
    open ??= { from: start + i, to: start + i, text: '' }
    if (j < m && (i === n || table[i * width + j + 1]! >= table[(i + 1) * width + j]!)) {
      open.text += next[start + j]
      j += 1
    } else {
      i += 1
      open.to = start + i
    }
  }
  close()
  return hunks
}

/** Replace the visible range [from, to) of a paragraph's lines by `typed`. */
function replaceRange(
  lines: readonly (readonly GulCell[])[],
  from: number,
  to: number,
  typed: string,
  codec: TextCodec,
): GulCell[][] {
  const olds = lines.map((cells) => visibleText(cells, codec))
  // the line that receives the typed text: the one holding the change start
  let target = olds.length - 1
  let offset = 0
  for (let i = 0; i < olds.length; i += 1) {
    if (from < offset + olds[i]!.length) {
      target = i
      break
    }
    offset += olds[i]!.length
  }
  let lineStart = 0
  return lines.map((cells, i) => {
    const old = olds[i]!
    const a = Math.min(Math.max(from - lineStart, 0), old.length)
    const b = Math.min(Math.max(to - lineStart, 0), old.length)
    lineStart += old.length
    const kept = old.slice(0, a) + (i === target ? typed : '') + old.slice(Math.max(b, a))
    return editCells(cells, kept, codec)
  })
}

/** Apply a paragraph-wide text change to the cells of its lines, one separate change at a time. */
export function editLines(
  lines: readonly (readonly GulCell[])[],
  next: string,
  codec: TextCodec = UNICODE_CODEC,
): GulCell[][] {
  const joined = lines.map((cells) => visibleText(cells, codec)).join('')
  let current: GulCell[][] = lines.map((cells) => cells.slice())
  // last change first, so the positions of the earlier ones stay valid
  for (const hunk of diffHunks(joined, next).reverse()) {
    current = replaceRange(current, hunk.from, hunk.to, hunk.text, codec)
  }
  return current
}
