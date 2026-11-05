/**
 * The main-process side of the Hunminjeongeum (.gul) editor. The shell imports this file by
 * relative path, so it is compiled into the shell bundle; a standalone window
 * (`startGulStandalone`) uses the same code.
 *
 * The document lives here, one `GulDocument` per view. The renderer lists its paragraphs over
 * IPC, sends every edit here as it is typed and asks for saves. Decided here and not left to
 * the renderer:
 *
 * - A file that did not open is never written. A path is a save target only after this side
 *   opened its bytes with the engine.
 * - Nothing changed: the file is not written. Changed: only the streams that were edited are
 *   packed again (the engine's `save`), written atomically, after the save conflict check.
 * - Unsaved edits are the engine's own state; the renderer has nothing the main side lacks, so
 *   a menu save or a close needs no flush from the page first.
 */
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { BrowserWindow, WebContentsView, app, dialog, ipcMain, protocol } from 'electron'
import type { WebContents } from 'electron'
import {
  RENDERER_SCHEME,
  RENDERER_SCHEME_PRIVILEGE,
  confirmOverwriteIfConflicted,
  contextMenuLabels,
  installContextMenu,
  installNavigationGuard,
  installRendererProtocol,
  isPathOpenElsewhere,
  recordDiskState,
  shouldDeferAutoSave,
  showSaveDialogWithMemory,
} from '@genoffice/electron-utils'
import type { SaveDiskState } from '@genoffice/electron-utils'
import { GulDocument, GulEncodingError } from '@genoffice/gul-engine'
import { getUiLang, normalizeLang, setUiLang } from '@genoffice/i18n'
import { atomicWriteFile } from './atomic-write'
import { tm } from './i18n-main'
import { APP_CHANNELS, GUL_CHANNELS } from '../shared/ipc'
import type {
  GulEditResult,
  GulOpenResult,
  GulParagraphView,
  GulSaveResult,
  SaveMode,
} from '../shared/ipc'

/** The one extension a document is saved with. */
const DOCUMENT_EXTENSION = '.gul'

export interface GulRuntimeConfig {
  preloadPath: string
  /** the renderer's dev server, when one runs */
  rendererUrl?: string
  rendererFile?: string
}

let runtime: GulRuntimeConfig = { preloadPath: '' }

export function configureGulRuntime(config: GulRuntimeConfig): void {
  runtime = config
}

/** Open path per view, queued at tab creation; kept until the view is destroyed so a reload consumes it again. */
const openPathByWc = new Map<number, string>()
/** File paths granted to each view: opening only allows these */
const allowedByWc = new Map<number, Set<string>>()
/** Current save target per view; absent until this side has seen the file open */
const savePathByWc = new Map<number, string>()
/** Views whose file this side has not seen open: not asked for yet, or failed. Nothing is written for them. */
const unopenedByWc = new Map<number, 'pending' | 'failed'>()
/** The open document of each view, and whether it holds edits that are not on disk */
const sessionByWc = new Map<number, { doc: GulDocument; dirty: boolean }>()
const contentsByWc = new Map<number, WebContents>()
/** The save running for each view; the next one waits for it */
const saveChainByWc = new Map<number, Promise<GulSaveResult>>()

function mayWrite(wcId: number): boolean {
  return !unopenedByWc.has(wcId) && sessionByWc.has(wcId)
}

// ── Split-copy save guard (decision 0036), as in the other editors ──
const docDiskStates = new Map<number, Map<string, SaveDiskState>>()

async function rememberDiskState(wcId: number, path: string): Promise<void> {
  const state = await recordDiskState(path)
  if (!state) return
  const states = docDiskStates.get(wcId) ?? new Map<string, SaveDiskState>()
  states.set(path, state)
  docDiskStates.set(wcId, states)
}

function forgetDiskState(wcId: number, path: string): void {
  const states = docDiskStates.get(wcId)
  if (!states) return
  states.delete(path)
  if (states.size === 0) docDiskStates.delete(wcId)
}

async function conflictStopsSave(
  contents: WebContents,
  path: string,
  auto: boolean,
): Promise<boolean> {
  if (!isPathOpenElsewhere(path)) return false
  const recorded = docDiskStates.get(contents.id)?.get(path)
  if (auto) return shouldDeferAutoSave(path, recorded)
  return (
    (await confirmOverwriteIfConflicted({
      parent: BrowserWindow.fromWebContents(contents),
      path,
      recorded,
      lang: getUiLang(),
    })) === 'cancel'
  )
}

/** Fired after a save lands on a NEW path (Save As): the shell syncs tab title, recents, projects */
let fileSavedHook: ((wc: WebContents, path: string) => void) | null = null

export function setGulFileSavedHook(hook: (wc: WebContents, path: string) => void): void {
  fileSavedHook = hook
}

/** Unsaved edits in the open document. */
export function gulIsDirty(webContentsId: number): boolean {
  return mayWrite(webContentsId) && sessionByWc.get(webContentsId)?.dirty === true
}

export function gulFilePath(webContentsId: number): string | undefined {
  return savePathByWc.get(webContentsId)
}

/** The file was renamed on disk: re-grant the new path and tell the renderer */
export function gulFileRenamed(contents: WebContents, oldPath: string, newPath: string): void {
  const wcId = contents.id
  if (savePathByWc.get(wcId) === oldPath) savePathByWc.set(wcId, newPath)
  if (openPathByWc.get(wcId) === oldPath) openPathByWc.set(wcId, newPath)
  const allowed = allowedByWc.get(wcId)
  if (allowed?.has(oldPath)) allowed.add(newPath)
  const states = docDiskStates.get(wcId)
  const recorded = states?.get(oldPath)
  if (states && recorded) {
    states.delete(oldPath)
    states.set(newPath, recorded)
  }
  if (!contents.isDestroyed()) contents.send(GUL_CHANNELS.fileRenamed, newPath)
}

/**
 * Close guard: true means proceed with closing. Clean → true; dirty → Save / Don't Save /
 * Cancel. On Save the document is written here, and the close goes on only if that worked.
 */
export async function requestGulClose(
  contents: WebContents,
  parent?: BrowserWindow | null,
): Promise<boolean> {
  if (contents.isDestroyed() || !gulIsDirty(contents.id)) return true
  const options = {
    type: 'warning' as const,
    message: tm('closeUnsavedMsg'),
    detail: tm('closeUnsavedDetail'),
    buttons: [tm('btnSave'), tm('btnDontSave'), tm('btnCancel')],
    defaultId: 0,
    cancelId: 2,
    noLink: true,
  }
  const { response } =
    parent && !parent.isDestroyed()
      ? await dialog.showMessageBox(parent, options)
      : await dialog.showMessageBox(options)
  if (response === 2) return false
  if (response === 1) return true
  const result = await runSave(contents, 'save', false)
  return result.ok && !('canceled' in result && result.canceled)
}

/** Menu Save / Save As; a clean plain save resolves true at once */
export async function requestGulSave(contents: WebContents, mode: SaveMode): Promise<boolean> {
  if (contents.isDestroyed() || !mayWrite(contents.id)) return false
  if (mode === 'save' && !gulIsDirty(contents.id) && savePathByWc.has(contents.id)) return true
  const result = await runSave(contents, mode, false)
  return result.ok && !('canceled' in result && result.canceled)
}

/**
 * Save the document to `filePath` with no dialog (the in-app MCP server's save). The view's
 * save target moves to `filePath` for the write, and goes back if the write fails.
 */
export async function gulSaveToPath(contents: WebContents, filePath: string): Promise<void> {
  if (contents.isDestroyed()) throw new Error('the document is no longer open')
  const wcId = contents.id
  if (!mayWrite(wcId)) throw new Error('the file did not open, so there is no document to save')
  const previous = savePathByWc.get(wcId)
  const allowed = allowedByWc.get(wcId) ?? new Set<string>()
  allowed.add(filePath)
  allowedByWc.set(wcId, allowed)
  savePathByWc.set(wcId, filePath)
  const result = await runSave(contents, 'save', false, true)
  if (!result.ok || ('canceled' in result && result.canceled)) {
    if (previous === undefined) savePathByWc.delete(wcId)
    else savePathByWc.set(wcId, previous)
    throw new Error('could not save the document')
  }
}

/** The document's text for the in-app MCP server's `read`; unsaved edits included. Nothing is written. */
export function gulReadText(contents: WebContents): Promise<string> {
  if (contents.isDestroyed()) return Promise.reject(new Error('the document is no longer open'))
  const session = sessionByWc.get(contents.id)
  if (!session) {
    return Promise.reject(new Error('the file did not open, so there is no document to read'))
  }
  return Promise.resolve(session.doc.text())
}

function runSave(
  contents: WebContents,
  mode: SaveMode,
  auto: boolean,
  skipDialog = false,
): Promise<GulSaveResult> {
  const wcId = contents.id
  // one save at a time per view: a second one starts from the bytes the first wrote
  const previous = saveChainByWc.get(wcId) ?? Promise.resolve({ ok: true } as GulSaveResult)
  const run = previous.then(async (): Promise<GulSaveResult> => {
    try {
      return await saveView(contents, mode, auto, skipDialog)
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
  })
  saveChainByWc.set(wcId, run)
  void run.then(() => {
    if (saveChainByWc.get(wcId) === run) saveChainByWc.delete(wcId)
  })
  return run
}

/** The Save As dialog's target, or 'canceled'; a plain save of a known file needs no dialog. */
async function resolveSaveTarget(
  contents: WebContents,
  mode: SaveMode,
  skipDialog: boolean,
): Promise<string | 'canceled'> {
  const current = savePathByWc.get(contents.id)
  if ((mode === 'save' || skipDialog) && current) return current
  const parent = BrowserWindow.fromWebContents(contents)
  const { canceled, filePath } = await showSaveDialogWithMemory(dialog, parent, {
    title: tm('dlgSaveTitle'),
    defaultPath: current ?? 'untitled' + DOCUMENT_EXTENSION,
    filters: [{ name: tm('filterGul'), extensions: ['gul'] }],
  })
  if (canceled || !filePath) return 'canceled'
  return extname(filePath).toLowerCase() === DOCUMENT_EXTENSION
    ? filePath
    : filePath + DOCUMENT_EXTENSION
}

async function saveView(
  contents: WebContents,
  mode: SaveMode,
  auto: boolean,
  skipDialog: boolean,
): Promise<GulSaveResult> {
  const wcId = contents.id
  const session = sessionByWc.get(wcId)
  if (!mayWrite(wcId) || !session) {
    return { ok: false, error: 'gul: the file did not open, nothing is written' }
  }
  const current = savePathByWc.get(wcId)
  if (mode === 'save' && current && (await conflictStopsSave(contents, current, auto))) {
    return { ok: false, error: 'external-modified' }
  }
  const target = await resolveSaveTarget(contents, mode, skipDialog)
  if (target === 'canceled') return { ok: true, canceled: true }
  const sameFile = current === target
  if (sameFile && !session.dirty) return { ok: true, path: target }
  await atomicWriteFile(target, Buffer.from(session.doc.save()))
  session.dirty = false
  savePathByWc.set(wcId, target)
  // keep the reload path in sync: a stale open path would reopen the old file
  openPathByWc.set(wcId, target)
  const allowed = allowedByWc.get(wcId) ?? new Set<string>()
  allowed.add(target)
  allowedByWc.set(wcId, allowed)
  await rememberDiskState(wcId, target)
  if (current && !sameFile) forgetDiskState(wcId, current)
  if (!sameFile) fileSavedHook?.(contents, target)
  return { ok: true, path: target }
}

// ── IPC ──

let ipcRegistered = false

function paragraphsOf(doc: GulDocument): GulParagraphView[] {
  return doc.paragraphs().map(({ index, part, text }) => ({ index, part, text }))
}

function registerGulIpc(): void {
  if (ipcRegistered) return
  ipcRegistered = true

  ipcMain.handle(GUL_CHANNELS.consumePending, (e) => openPathByWc.get(e.sender.id) ?? null)

  ipcMain.handle(GUL_CHANNELS.openFile, async (e, path: unknown): Promise<GulOpenResult> => {
    const wcId = e.sender.id
    if (typeof path !== 'string' || !allowedByWc.get(wcId)?.has(path)) {
      throw new Error('gul: path not granted to this view')
    }
    // A reload of a view whose document holds unsaved edits gets that document back, edits and all.
    const held = sessionByWc.get(wcId)
    let session: { doc: GulDocument; dirty: boolean }
    if (held?.dirty && savePathByWc.get(wcId) === path) {
      session = held
    } else {
      let bytes: Uint8Array
      try {
        bytes = new Uint8Array(await readFile(path))
      } catch {
        refuseWrites(wcId)
        return { status: 'refused', reason: 'unreadable' }
      }
      if (!GulDocument.isGul(bytes)) {
        refuseWrites(wcId)
        return { status: 'refused', reason: 'not-gul' }
      }
      try {
        session = { doc: GulDocument.open(bytes), dirty: false }
      } catch (err) {
        // an encrypted document or a layout the engine does not know: never written back
        console.warn(`[gul] the file did not open (${String(err)}): ${path}`)
        refuseWrites(wcId)
        return { status: 'refused', reason: 'unsupported' }
      }
      sessionByWc.set(wcId, session)
      await rememberDiskState(wcId, path)
    }
    // Seen open, here: only now is the path a save target.
    unopenedByWc.delete(wcId)
    savePathByWc.set(wcId, path)
    return { status: 'ok', path, paragraphs: paragraphsOf(session.doc) }
  })

  ipcMain.handle(GUL_CHANNELS.setParagraph, (e, request: unknown): GulEditResult => {
    const wcId = e.sender.id
    const session = sessionByWc.get(wcId)
    if (!session || !mayWrite(wcId)) return { ok: false, error: 'not-open' }
    const { index, text } = (request ?? {}) as Record<string, unknown>
    if (typeof index !== 'number' || !Number.isSafeInteger(index) || typeof text !== 'string') {
      return { ok: false, error: 'invalid-request' }
    }
    try {
      session.doc.setParagraphText(index, text)
    } catch (err) {
      // an old document cannot hold every character; the paragraph is left as it was
      if (err instanceof GulEncodingError) return { ok: false, error: 'unencodable' }
      return { ok: false, error: err instanceof Error ? err.message : String(err) }
    }
    session.dirty = true
    return { ok: true }
  })

  ipcMain.handle(GUL_CHANNELS.save, (e, request: unknown): Promise<GulSaveResult> => {
    const raw = (request ?? {}) as { mode?: unknown }
    return runSave(e.sender, raw.mode === 'saveAs' ? 'saveAs' : 'save', false)
  })

  // Language channel shared with other modules; removeHandler tolerates duplicate registration
  ipcMain.removeHandler(APP_CHANNELS.getLanguage)
  ipcMain.handle(APP_CHANNELS.getLanguage, () => getUiLang())
}

/** The view's file did not open: it has no save target and gets none. */
function refuseWrites(wcId: number): void {
  unopenedByWc.set(wcId, 'failed')
  savePathByWc.delete(wcId)
  sessionByWc.delete(wcId)
}

function forgetView(wcId: number): void {
  openPathByWc.delete(wcId)
  allowedByWc.delete(wcId)
  savePathByWc.delete(wcId)
  unopenedByWc.delete(wcId)
  sessionByWc.delete(wcId)
  contentsByWc.delete(wcId)
  docDiskStates.delete(wcId)
  saveChainByWc.delete(wcId)
}

function grantAndTrack(wc: WebContents, openPath?: string | null): void {
  const wcId = wc.id
  contentsByWc.set(wcId, wc)
  // A document view always opens a file; until it has opened here nothing is written.
  unopenedByWc.set(wcId, 'pending')
  if (openPath && existsSync(openPath)) {
    openPathByWc.set(wcId, openPath)
    allowedByWc.set(wcId, new Set([openPath]))
  }
  // The page never opens a window or leaves itself.
  wc.setWindowOpenHandler(() => ({ action: 'deny' }))
  wc.on('will-navigate', (event, url) => {
    if (url !== wc.getURL()) event.preventDefault()
  })
  wc.once('destroyed', () => forgetView(wcId))
}

/** The address the renderer is loaded from: the dev server when one runs, else the built files behind the app scheme. */
function gulRendererUrl(): string {
  return runtime.rendererUrl ?? `${RENDERER_SCHEME}://gul/index.html`
}

const VIEW_PREFERENCES = {
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
} as const

/** A document tab for the shell. */
export function createGulView(openPath: string): WebContentsView {
  registerGulIpc()
  const view = new WebContentsView({
    webPreferences: { preload: runtime.preloadPath, ...VIEW_PREFERENCES },
  })
  grantAndTrack(view.webContents, openPath)
  void view.webContents.loadURL(gulRendererUrl())
  return view
}

/** Standalone window mode: `npm run dev -w @genoffice/gul`, a document path passed via argv */
export function startGulStandalone(): void {
  protocol.registerSchemesAsPrivileged([RENDERER_SCHEME_PRIVILEGE])
  installNavigationGuard(app)
  installContextMenu(app, () => contextMenuLabels(getUiLang()))
  configureGulRuntime({
    preloadPath: join(__dirname, '../preload/index.js'),
    rendererUrl: process.env.ELECTRON_RENDERER_URL,
    rendererFile: join(__dirname, '../renderer/index.html'),
  })
  if (process.env.GENOFFICE_USER_DATA) app.setPath('userData', process.env.GENOFFICE_USER_DATA)
  void app.whenReady().then(() => {
    // there is no shell to say which language the user picked
    setUiLang(normalizeLang(process.env.GENOFFICE_LANG ?? app.getLocale()))
    installRendererProtocol({ gul: join(__dirname, '../renderer') })
    registerGulIpc()
    const win = new BrowserWindow({
      width: 1100,
      height: 800,
      webPreferences: { preload: runtime.preloadPath, ...VIEW_PREFERENCES },
    })
    const argPath = process.argv.slice(1).find((a) => /\.gul$/i.test(a) && existsSync(a))
    grantAndTrack(win.webContents, argPath)
    void win.loadURL(gulRendererUrl())
  })
  app.on('window-all-closed', () => app.quit())
}
