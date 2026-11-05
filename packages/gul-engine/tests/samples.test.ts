import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CompoundFile,
  GulDocument,
  cellsOf,
  isTextRecord,
  lzwDecode,
  parseRecordStream,
  refreshChecks,
  serializeRecordStream,
} from '../src/index'

/**
 * Real .gul documents are the author's own files and are not in the repository. Point
 * GUL_SAMPLE_DIR at a folder of them to run these; without it the suite is skipped.
 */
const dir = process.env.GUL_SAMPLE_DIR
const files =
  dir && existsSync(dir)
    ? readdirSync(dir).filter((name) => name.toLowerCase().endsWith('.gul'))
    : []

function streamsOf(bytes: Uint8Array): Map<string, string> {
  const out = new Map<string, string>()
  for (const entry of CompoundFile.read(bytes).entries) {
    if (entry.type === 2 && entry.data) out.set(entry.name, Buffer.from(entry.data).toString('hex'))
  }
  return out
}

describe.skipIf(files.length === 0)('real .gul samples', () => {
  for (const name of files) {
    const bytes = new Uint8Array(readFileSync(join(dir!, name)))

    it(`${name}: opens and lists text`, () => {
      expect(GulDocument.isGul(bytes)).toBe(true)
      const doc = GulDocument.open(bytes)
      const text = doc.text()
      expect(text.length).toBeGreaterThan(20)
      expect(doc.paragraphs().length).toBeGreaterThan(1)
    })

    it(`${name}: text reads as text, not as stored codes`, () => {
      const doc = GulDocument.open(bytes)
      const text = doc.text()
      expect(['unicode', 'ks']).toContain(doc.encoding)
      expect(text).not.toContain('\ufffd')
      // old documents store KS X 1001 codes; read as Unicode they come out as Hangul gibberish
      const garbled = [...text].filter((ch) => ch >= '\ue000' && ch <= '\uf8ff').length
      expect(garbled).toBe(0)
    })

    it(`${name}: saving without edits keeps every stream byte for byte`, () => {
      const saved = GulDocument.open(bytes).save()
      expect(streamsOf(saved)).toEqual(streamsOf(bytes))
    })

    it(`${name}: an edit changes only the pages it touches and survives a reopen`, () => {
      const doc = GulDocument.open(bytes)
      const paragraphs = doc.paragraphs()
      const target = paragraphs.find((p) => p.text.trim().length > 6)!
      const edited = `${target.text.slice(0, 3)}[고침]${target.text.slice(3)}`
      doc.setParagraphText(target.index, edited)
      const saved = doc.save()

      const again = GulDocument.open(saved)
      expect(again.paragraphs()[target.index]!.text).toBe(edited)
      expect(again.paragraphs().length).toBe(paragraphs.length)

      const before = streamsOf(bytes)
      const after = streamsOf(saved)
      const changed = [...before.keys()].filter((key) => before.get(key) !== after.get(key))
      expect(changed).toEqual([target.part])

      // the new page stream is still a clean chain of records
      const entry = CompoundFile.read(saved).find(target.part)!
      expect(parseRecordStream(lzwDecode(entry.data!))).not.toBeNull()
    })
  }
})

describe.skipIf(files.length === 0)('same-length replacement keeps the layout', () => {
  for (const name of files) {
    it(`${name}: every line keeps its cell count`, () => {
      const bytes = new Uint8Array(readFileSync(join(dir!, name)))
      const before = CompoundFile.read(bytes)
      const doc = GulDocument.open(bytes)
      const word = doc
        .paragraphs()
        .find((p) => p.text.trim().length > 4)!
        .text.trim()
        .slice(0, 2)
      const count = doc.replaceText(word, '#'.repeat(word.length))
      expect(count).toBeGreaterThan(0)
      const after = CompoundFile.read(doc.save())
      for (const entry of before.entries) {
        if (entry.type !== 2 || !/PAGE|Frame/.test(entry.name)) continue
        const a = parseRecordStream(lzwDecode(entry.data!))!
        const b = parseRecordStream(lzwDecode(after.find(entry.name)!.data!))!
        expect(b.records.map((r) => r.body.length)).toEqual(a.records.map((r) => r.body.length))
        // only the character codes of the replaced cells differ
        a.records.forEach((record, i) => {
          if (!isTextRecord(record)) return expect(b.records[i]!.body).toEqual(record.body)
          const x = cellsOf(record)
          const y = cellsOf(b.records[i]!)
          y.forEach((cell, k) => expect({ ...cell, code: 0 }).toEqual({ ...x[k]!, code: 0 }))
        })
      }
    })
  }
})

describe.skipIf(files.length === 0)('record check bytes', () => {
  for (const name of files) {
    it(`${name}: refreshing the checks of every stream reproduces the original bytes`, () => {
      for (const entry of CompoundFile.read(new Uint8Array(readFileSync(join(dir!, name))))
        .entries) {
        if (entry.type !== 2 || !entry.data) continue
        if (!/^(Master|Web)?PAGE\d+$|Anchored Frame$/.test(entry.name)) continue
        const raw = lzwDecode(entry.data)
        const stream = parseRecordStream(raw)!
        refreshChecks(stream)
        expect(Buffer.from(serializeRecordStream(stream)).equals(Buffer.from(raw))).toBe(true)
      }
    })
  }
})
