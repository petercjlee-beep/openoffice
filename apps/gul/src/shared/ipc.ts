/**
 * The contract between the Hunminjeongeum renderer, its preload and the main process.
 *
 * Every channel of this editor starts with `gul:`. The main processes of all editors run in
 * one process, so a name may be registered only once. The `app:*` channels are owned by the
 * shell; this editor only calls them.
 *
 * The document lives in the main process (one `GulDocument` per view). The renderer lists its
 * paragraphs, sends each edit here as it is typed and asks for saves; it never holds the file.
 */
import type { Lang } from '@genoffice/i18n'

export const GUL_CHANNELS = {
  /** invoke → `string | null`: the path queued for this view */
  consumePending: 'gul:consume-pending',
  /** invoke(path) → `GulOpenResult`: open a granted path */
  openFile: 'gul:open-file',
  /** invoke({ index, text }) → `GulEditResult`: replace the text of one paragraph */
  setParagraph: 'gul:set-paragraph',
  /** invoke({ mode }) → `GulSaveResult` */
  save: 'gul:save',
  /** main → renderer(path): the file was renamed or saved under a new name */
  fileRenamed: 'gul:file-renamed',
} as const

export const APP_CHANNELS = {
  getLanguage: 'app:get-language',
  languageChanged: 'app:language-changed',
  getTheme: 'app:get-theme',
  themeChanged: 'app:theme-changed',
} as const

export type UiTheme = 'light' | 'dark' | 'system'
export type SaveMode = 'save' | 'saveAs'

/** One paragraph as the renderer lists it. */
export interface GulParagraphView {
  index: number
  /** which page, master page or frame list it belongs to (`PAGE0`, `Anchored Frame`) */
  part: string
  text: string
}

export type GulRefusalReason = 'unreadable' | 'not-gul' | 'unsupported'

export type GulOpenResult =
  | { status: 'ok'; path: string; paragraphs: GulParagraphView[] }
  | { status: 'refused'; reason: GulRefusalReason }

export type GulEditResult = { ok: true } | { ok: false; error: string }

export type GulSaveResult =
  | { ok: true; path: string; canceled?: undefined }
  | { ok: true; canceled: true }
  | { ok: false; error: string }

export interface GulApi {
  consumePending(): Promise<string | null>
  openFile(path: string): Promise<GulOpenResult>
  setParagraph(request: { index: number; text: string }): Promise<GulEditResult>
  save(request: { mode: SaveMode }): Promise<GulSaveResult>
  onFileRenamed(handler: (path: string) => void): () => void
  getLanguage(): Promise<Lang>
  onLanguageChanged(handler: (lang: Lang) => void): () => void
  getTheme(): Promise<UiTheme>
  onThemeChanged(handler: (theme: UiTheme) => void): () => void
}

declare global {
  interface Window {
    gulApi: GulApi
  }
}
