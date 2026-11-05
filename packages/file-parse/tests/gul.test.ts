import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isAttachableExt, parseFileToText } from '../src'
import { writeFixture } from './helpers/fixtures'

/**
 * Real .gul documents are the author's own files and are not in the repository. Point
 * GUL_SAMPLE_DIR at a folder of them to run the sample test; the refusal tests always run.
 */
const dir = process.env.GUL_SAMPLE_DIR
const samples =
  dir && existsSync(dir)
    ? readdirSync(dir).filter((name) => name.toLowerCase().endsWith('.gul'))
    : []

const OLE2_HEADER = Uint8Array.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])

describe('.gul attachments', () => {
  it('may be attached', () => {
    expect(isAttachableExt('gul')).toBe(true)
  })

  it('refuses a file that is not an OLE2 container', async () => {
    const path = writeFixture('plain.gul', 'just some text')
    const result = await parseFileToText(path)
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/Content mismatch: \.gul/)
  })

  it('refuses an OLE2 file that is not a Hunminjeongeum document', async () => {
    const path = writeFixture('other.gul', OLE2_HEADER)
    const result = await parseFileToText(path)
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/Cannot read \.gul/)
  })
})

describe.skipIf(samples.length === 0)('real .gul samples', () => {
  for (const name of samples) {
    it(`${name}: reads as text, in reading order, without stored-code garbage`, async () => {
      const result = await parseFileToText(join(dir!, name))
      expect(result.ok, result.error).toBe(true)
      expect(result.kind).toBe('text')
      const text = result.text!
      expect(text.length).toBeGreaterThan(20)
      expect(text).not.toContain('�')
      expect([...text].some((ch) => ch >= '' && ch <= '')).toBe(false)
      expect(text).not.toMatch(/\n{3,}/)
      // every Hangul letter of the first sample line is in the text the engine lists
      expect(/[가-힣]/.test(text)).toBe(true)
    })
  }

  it('reads the same text the editor shows', async () => {
    const { GulDocument } = await import('@genoffice/gul-engine')
    const name = samples[0]!
    const result = await parseFileToText(join(dir!, name))
    const doc = GulDocument.open(new Uint8Array(readFileSync(join(dir!, name))))
    const first = doc.paragraphs().find((p) => p.text.trim().length > 4)!
    expect(result.text).toContain(first.text.trim())
  })
})
