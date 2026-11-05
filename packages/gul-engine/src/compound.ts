/**
 * A small reader and writer for the OLE compound files (version 3, 512-byte sectors) that .gul
 * documents are saved as. The original program writes 0x100000 in the header's mini stream cutoff
 * field while it lays streams out by the standard 4096-byte rule, so the cutoff is always taken
 * as 4096 here and the header field is kept as it was.
 *
 * Writing lays the whole file out again but keeps every directory entry as read (names, tree
 * links, class ids, times) and changes only the start sector and size of the streams it moves.
 */

const SECTOR = 512
const MINI_SECTOR = 64
const CUTOFF = 4096
const FREE = 0xffffffff
const END_OF_CHAIN = 0xfffffffe
const FAT_SECTOR = 0xfffffffd
const DIFAT_SECTOR = 0xfffffffc
const ENTRY_SIZE = 128
const HEADER_DIFAT = 109
const SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]

export class CompoundFileError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CompoundFileError'
  }
}

export interface CompoundEntry {
  /** Position in the directory; 0 is the root */
  index: number
  name: string
  /** 1 storage, 2 stream, 5 root */
  type: number
  raw: Uint8Array
  /** Stream bytes; null for storages and the root (whose content is the mini stream) */
  data: Uint8Array | null
}

export class CompoundFile {
  private constructor(
    private readonly header: Uint8Array,
    readonly entries: CompoundEntry[],
  ) {}

  static isCompound(file: Uint8Array): boolean {
    return file.length >= 512 && SIGNATURE.every((byte, i) => file[i] === byte)
  }

  static read(file: Uint8Array): CompoundFile {
    if (!CompoundFile.isCompound(file)) throw new CompoundFileError('not a compound file')
    const view = new DataView(file.buffer, file.byteOffset, file.byteLength)
    if (view.getUint16(0x1e, true) !== 9) throw new CompoundFileError('only 512-byte sectors')
    const sectorAt = (id: number): Uint8Array => {
      const start = (id + 1) * SECTOR
      if (id >= 0xfffffffa || start + SECTOR > file.length) {
        throw new CompoundFileError(`sector ${id} is outside the file`)
      }
      return file.subarray(start, start + SECTOR)
    }

    // the FAT: sector ids come from the header and from the DIFAT chain
    const fatIds: number[] = []
    for (let i = 0; i < HEADER_DIFAT; i += 1) {
      const id = view.getUint32(0x4c + i * 4, true)
      if (id < DIFAT_SECTOR) fatIds.push(id)
    }
    let difat = view.getUint32(0x44, true)
    for (let guard = 0; difat < DIFAT_SECTOR && guard < 4096; guard += 1) {
      const sector = sectorAt(difat)
      const sv = new DataView(sector.buffer, sector.byteOffset, SECTOR)
      for (let i = 0; i < SECTOR / 4 - 1; i += 1) {
        const id = sv.getUint32(i * 4, true)
        if (id < DIFAT_SECTOR) fatIds.push(id)
      }
      difat = sv.getUint32(SECTOR - 4, true)
    }
    const fat: number[] = []
    for (const id of fatIds) {
      const sector = sectorAt(id)
      const sv = new DataView(sector.buffer, sector.byteOffset, SECTOR)
      for (let i = 0; i < SECTOR / 4; i += 1) fat.push(sv.getUint32(i * 4, true))
    }
    const chain = (start: number): number[] => {
      const ids: number[] = []
      let id = start
      while (id < DIFAT_SECTOR) {
        if (ids.length > fat.length) throw new CompoundFileError('loop in a sector chain')
        ids.push(id)
        id = fat[id] ?? END_OF_CHAIN
      }
      return ids
    }
    const readChain = (start: number): Uint8Array => {
      const ids = chain(start)
      const out = new Uint8Array(ids.length * SECTOR)
      ids.forEach((id, i) => out.set(sectorAt(id), i * SECTOR))
      return out
    }

    const directory = readChain(view.getUint32(0x30, true))
    const dv = new DataView(directory.buffer, directory.byteOffset, directory.byteLength)
    const rawEntries: Uint8Array[] = []
    for (let at = 0; at + ENTRY_SIZE <= directory.length; at += ENTRY_SIZE) {
      rawEntries.push(directory.slice(at, at + ENTRY_SIZE))
    }
    const root = rawEntries[0]
    if (!root || root[66] !== 5) throw new CompoundFileError('no root entry')

    const miniStream = readChain(dv.getUint32(116, true)).subarray(
      0,
      Number(dv.getBigUint64(120, true)),
    )
    const miniFat: number[] = []
    const miniFatBytes = readChain(view.getUint32(0x3c, true))
    const mv = new DataView(miniFatBytes.buffer, miniFatBytes.byteOffset, miniFatBytes.byteLength)
    for (let i = 0; i + 4 <= miniFatBytes.length; i += 4) miniFat.push(mv.getUint32(i, true))

    const entries: CompoundEntry[] = rawEntries.map((raw, index) => {
      const ev = new DataView(raw.buffer, raw.byteOffset, raw.byteLength)
      const nameLength = ev.getUint16(64, true)
      const type = raw[66]!
      const name =
        nameLength >= 2 ? new TextDecoder('utf-16le').decode(raw.subarray(0, nameLength - 2)) : ''
      let data: Uint8Array | null = null
      if (type === 2) {
        const start = ev.getUint32(116, true)
        const size = Number(ev.getBigUint64(120, true))
        if (size < CUTOFF) {
          const out = new Uint8Array(size)
          let id = start
          for (let at = 0; at < size; at += MINI_SECTOR) {
            if (id >= DIFAT_SECTOR) throw new CompoundFileError(`stream ${name} is cut short`)
            const from = id * MINI_SECTOR
            out.set(miniStream.subarray(from, from + Math.min(MINI_SECTOR, size - at)), at)
            id = miniFat[id] ?? END_OF_CHAIN
          }
          data = out
        } else {
          data = readChain(start).slice(0, size)
        }
      }
      return { index, name, type, raw, data }
    })
    return new CompoundFile(file.slice(0, SECTOR), entries)
  }

  find(name: string): CompoundEntry | undefined {
    return this.entries.find((entry) => entry.type === 2 && entry.name === name)
  }

  setStream(name: string, data: Uint8Array): void {
    const entry = this.find(name)
    if (!entry) throw new CompoundFileError(`no stream ${name}`)
    entry.data = data
  }

  /** The file with every stream laid out again; entries and header fields stay as read. */
  write(): Uint8Array {
    const miniChunks: Uint8Array[] = []
    const regular: { entry: CompoundEntry; sectors: number }[] = []
    const miniStarts = new Map<number, number>()
    let miniSectors = 0
    for (const entry of this.entries) {
      if (entry.type !== 2 || !entry.data) continue
      if (entry.data.length === 0) continue
      if (entry.data.length < CUTOFF) {
        const count = Math.ceil(entry.data.length / MINI_SECTOR)
        const padded = new Uint8Array(count * MINI_SECTOR)
        padded.set(entry.data)
        miniChunks.push(padded)
        miniStarts.set(entry.index, miniSectors)
        miniSectors += count
      } else {
        regular.push({ entry, sectors: Math.ceil(entry.data.length / SECTOR) })
      }
    }
    const miniStream = new Uint8Array(miniSectors * MINI_SECTOR)
    let miniAt = 0
    for (const chunk of miniChunks) {
      miniStream.set(chunk, miniAt)
      miniAt += chunk.length
    }

    const miniStreamSectors = Math.ceil(miniStream.length / SECTOR)
    const miniFatSectors = Math.ceil((miniSectors * 4) / SECTOR)
    const directorySectors = Math.ceil((this.entries.length * ENTRY_SIZE) / SECTOR)
    let dataSectors = miniStreamSectors + miniFatSectors + directorySectors
    for (const item of regular) dataSectors += item.sectors
    // FAT sectors must also be mapped by the FAT, and past 109 of them a DIFAT chain is needed
    let fatSectors = 0
    let difatSectors = 0
    for (;;) {
      const total = dataSectors + fatSectors + difatSectors
      const needFat = Math.ceil(total / (SECTOR / 4))
      const needDifat =
        needFat > HEADER_DIFAT ? Math.ceil((needFat - HEADER_DIFAT) / (SECTOR / 4 - 1)) : 0
      if (needFat === fatSectors && needDifat === difatSectors) break
      fatSectors = needFat
      difatSectors = needDifat
    }
    const total = dataSectors + fatSectors + difatSectors

    const out = new Uint8Array(SECTOR + total * SECTOR)
    const view = new DataView(out.buffer)
    const fat = new Array<number>(fatSectors * (SECTOR / 4)).fill(FREE)
    let next = 0
    const place = (bytes: Uint8Array, sectors: number): number => {
      const start = next
      out.set(bytes, SECTOR + start * SECTOR)
      for (let i = 0; i < sectors; i += 1)
        fat[start + i] = i === sectors - 1 ? END_OF_CHAIN : start + i + 1
      next += sectors
      return sectors === 0 ? END_OF_CHAIN : start
    }

    const miniStreamStart = place(miniStream, miniStreamSectors)
    const startOf = new Map<number, number>()
    for (const item of regular) startOf.set(item.entry.index, place(item.entry.data!, item.sectors))
    const miniFatBytes = new Uint8Array(miniFatSectors * SECTOR).fill(0xff)
    const mfv = new DataView(miniFatBytes.buffer)
    for (const entry of this.entries) {
      const start = miniStarts.get(entry.index)
      if (start === undefined) continue
      const count = Math.ceil(entry.data!.length / MINI_SECTOR)
      for (let i = 0; i < count; i += 1) {
        mfv.setUint32((start + i) * 4, i === count - 1 ? END_OF_CHAIN : start + i + 1, true)
      }
    }
    const miniFatStart = place(miniFatBytes, miniFatSectors)

    const directory = new Uint8Array(directorySectors * SECTOR)
    this.entries.forEach((entry, i) => {
      const slot = directory.subarray(i * ENTRY_SIZE, (i + 1) * ENTRY_SIZE)
      slot.set(entry.raw)
      const sv = new DataView(slot.buffer, slot.byteOffset, ENTRY_SIZE)
      let start = 0
      let size = 0
      if (entry.type === 5) {
        start = miniStreamStart
        size = miniStream.length
      } else if (entry.type === 2) {
        const length = entry.data?.length ?? 0
        size = length
        start =
          length === 0 ? END_OF_CHAIN : (miniStarts.get(entry.index) ?? startOf.get(entry.index)!)
      }
      if (entry.type === 5 || entry.type === 2) {
        sv.setUint32(116, start, true)
        sv.setBigUint64(120, BigInt(size), true)
      }
    })
    // unused slots after the last entry stay empty with no siblings
    for (let i = this.entries.length; i < directorySectors * (SECTOR / ENTRY_SIZE); i += 1) {
      const slot = directory.subarray(i * ENTRY_SIZE, (i + 1) * ENTRY_SIZE)
      const sv = new DataView(slot.buffer, slot.byteOffset, ENTRY_SIZE)
      sv.setUint32(68, FREE, true)
      sv.setUint32(72, FREE, true)
      sv.setUint32(76, FREE, true)
    }
    const directoryStart = place(directory, directorySectors)

    const fatStart = next
    for (let i = 0; i < fatSectors; i += 1) fat[next + i] = FAT_SECTOR
    next += fatSectors
    const difatStart = difatSectors === 0 ? END_OF_CHAIN : next
    for (let i = 0; i < difatSectors; i += 1) fat[next + i] = DIFAT_SECTOR
    next += difatSectors

    // the FAT sectors themselves
    for (let i = 0; i < fatSectors; i += 1) {
      for (let j = 0; j < SECTOR / 4; j += 1) {
        view.setUint32(SECTOR + (fatStart + i) * SECTOR + j * 4, fat[i * (SECTOR / 4) + j]!, true)
      }
    }

    out.set(this.header, 0)
    const hv = new DataView(out.buffer, 0, SECTOR)
    hv.setUint32(0x2c, fatSectors, true)
    hv.setUint32(0x30, directoryStart, true)
    hv.setUint32(0x3c, miniFatSectors === 0 ? END_OF_CHAIN : miniFatStart, true)
    hv.setUint32(0x40, miniFatSectors, true)
    hv.setUint32(0x44, difatStart, true)
    hv.setUint32(0x48, difatSectors, true)
    const fatIds = Array.from({ length: fatSectors }, (_, i) => fatStart + i)
    for (let i = 0; i < HEADER_DIFAT; i += 1) hv.setUint32(0x4c + i * 4, fatIds[i] ?? FREE, true)
    for (let d = 0; d < difatSectors; d += 1) {
      const at = SECTOR + (difatStart + d) * SECTOR
      for (let j = 0; j < SECTOR / 4 - 1; j += 1) {
        view.setUint32(at + j * 4, fatIds[HEADER_DIFAT + d * (SECTOR / 4 - 1) + j] ?? FREE, true)
      }
      view.setUint32(
        at + SECTOR - 4,
        d === difatSectors - 1 ? END_OF_CHAIN : difatStart + d + 1,
        true,
      )
    }
    return out
  }
}
