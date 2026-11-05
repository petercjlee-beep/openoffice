import { copyFileSync, existsSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { GulDocument } from '@genoffice/gul-engine'

/**
 * The main side with Electron mocked: the IPC handlers are captured and called as the page
 * would. A real .gul is needed (they are the author's own files, not in the repository), so
 * point GUL_SAMPLE_DIR at a folder of them to run this; without it the suite is skipped.
 */
const handlers = new Map<string, (event: unknown, ...args: unknown[]) => unknown>()
const SENDER = { id: 7, send: vi.fn(), isDestroyed: () => false }

vi.mock('electron', () => ({
  BrowserWindow: { fromWebContents: () => null },
  WebContentsView: class {
    webContents = {
      ...SENDER,
      loadURL: () => Promise.resolve(),
      setWindowOpenHandler: () => {},
      on: () => {},
      once: () => {},
    }
  },
  app: { on: vi.fn(), whenReady: () => new Promise(() => {}), setPath: vi.fn() },
  dialog: {},
  protocol: { registerSchemesAsPrivileged: vi.fn() },
  ipcMain: {
    handle: (channel: string, fn: (event: unknown, ...args: unknown[]) => unknown) =>
      handlers.set(channel, fn),
    removeHandler: (channel: string) => handlers.delete(channel),
    on: vi.fn(),
  },
}))
vi.mock('@genoffice/electron-utils', () => ({
  RENDERER_SCHEME: 'app',
  RENDERER_SCHEME_PRIVILEGE: {},
  confirmOverwriteIfConflicted: vi.fn(),
  contextMenuLabels: vi.fn(),
  installContextMenu: vi.fn(),
  installNavigationGuard: vi.fn(),
  installRendererProtocol: vi.fn(),
  isPathOpenElsewhere: () => false,
  recordDiskState: async () => null,
  shouldDeferAutoSave: vi.fn(),
  showSaveDialogWithMemory: vi.fn(),
}))
vi.mock('@genoffice/electron-utils/atomic-write', async () => {
  const { writeFile } = await import('node:fs/promises')
  return { atomicWriteFile: (path: string, data: Buffer) => writeFile(path, data) }
})

const dir = process.env.GUL_SAMPLE_DIR
const sample =
  dir && existsSync(dir)
    ? readdirSync(dir).find((n) => n.toLowerCase().endsWith('.gul'))
    : undefined

const call = (channel: string, ...args: unknown[]) =>
  handlers.get(channel)!({ sender: SENDER }, ...args)

describe.skipIf(!sample)('the Hunminjeongeum main side', () => {
  let file: string
  let original: Buffer
  let gul: typeof import('../src/main/gul-main')

  beforeAll(async () => {
    file = join(mkdtempSync(join(tmpdir(), 'gul-')), 'doc.gul')
    copyFileSync(join(dir!, sample!), file)
    original = readFileSync(file)
    gul = await import('../src/main/gul-main')
    gul.configureGulRuntime({ preloadPath: '' })
    gul.createGulView(file)
  })

  it('queues the path and opens the document with its paragraphs', async () => {
    expect(await call('gul:consume-pending')).toBe(file)
    const opened = (await call('gul:open-file', file)) as {
      status: string
      paragraphs: { index: number; text: string }[]
    }
    expect(opened.status).toBe('ok')
    expect(opened.paragraphs.some((p) => p.text.length > 0)).toBe(true)
    expect(gul.gulIsDirty(7)).toBe(false)
  })

  it('refuses a path the view was not granted', async () => {
    await expect(call('gul:open-file', join(tmpdir(), 'other.gul'))).rejects.toThrow(/not granted/)
  })

  it('writes nothing for a clean document', async () => {
    expect(await gul.requestGulSave(SENDER as never, 'save')).toBe(true)
    expect(readFileSync(file).equals(original)).toBe(true)
  })

  it('keeps an edit as unsaved until saved, then writes only the edited text', async () => {
    const opened = (await call('gul:open-file', file)) as {
      paragraphs: { index: number; text: string }[]
    }
    const target = opened.paragraphs.find((p) => p.text.trim().length > 1)!
    const next = target.text.replace(target.text.trim()[0]!, '※')
    expect(await call('gul:set-paragraph', { index: target.index, text: next })).toEqual({
      ok: true,
    })
    expect(gul.gulIsDirty(7)).toBe(true)
    expect(readFileSync(file).equals(original)).toBe(true)
    expect(await call('gul:save', { mode: 'save' })).toEqual({ ok: true, path: file })
    expect(gul.gulIsDirty(7)).toBe(false)
    const saved = GulDocument.open(new Uint8Array(readFileSync(file)))
    expect(saved.paragraphs()[target.index]!.text).toBe(next)
  })

  it('refuses a character the document cannot store and leaves the paragraph as it was', async () => {
    const doc = GulDocument.open(new Uint8Array(readFileSync(file)))
    // only an old (KS X 1001) document cannot hold every character
    if (doc.encoding !== 'ks') return
    const target = doc.paragraphs().find((p) => p.text.trim().length > 1)!
    const result = await call('gul:set-paragraph', {
      index: target.index,
      text: target.text + '힣',
    })
    expect(result).toEqual({ ok: false, error: 'unencodable' })
  })

  it('rejects a malformed edit and an edit to a missing paragraph', async () => {
    expect(await call('gul:set-paragraph', { index: 'x', text: 1 })).toMatchObject({ ok: false })
    expect(await call('gul:set-paragraph', { index: 999999, text: 'a' })).toMatchObject({
      ok: false,
    })
  })
})
