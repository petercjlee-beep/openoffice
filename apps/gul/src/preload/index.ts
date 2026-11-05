/**
 * Preload of the Hunminjeongeum editor: exposes `window.gulApi` (see ../shared/ipc).
 */
import { contextBridge, ipcRenderer } from 'electron'
import type { Lang } from '@genoffice/i18n'
import { APP_CHANNELS, GUL_CHANNELS } from '../shared/ipc'
import type { GulApi, UiTheme } from '../shared/ipc'

/** Subscribes to a channel the main process sends on; returns the way to stop. */
function listen<Args extends unknown[]>(
  channel: string,
  handler: (...args: Args) => void,
): () => void {
  const listener = (_e: Electron.IpcRendererEvent, ...args: unknown[]) => handler(...(args as Args))
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api: GulApi = {
  consumePending: () => ipcRenderer.invoke(GUL_CHANNELS.consumePending),
  openFile: (path) => ipcRenderer.invoke(GUL_CHANNELS.openFile, path),
  setParagraph: (request) => ipcRenderer.invoke(GUL_CHANNELS.setParagraph, request),
  save: (request) => ipcRenderer.invoke(GUL_CHANNELS.save, request),
  onFileRenamed: (handler) => listen<[string]>(GUL_CHANNELS.fileRenamed, handler),
  getLanguage: () => ipcRenderer.invoke(APP_CHANNELS.getLanguage),
  onLanguageChanged: (handler) => listen<[Lang]>(APP_CHANNELS.languageChanged, handler),
  getTheme: () => ipcRenderer.invoke(APP_CHANNELS.getTheme),
  onThemeChanged: (handler) => listen<[UiTheme]>(APP_CHANNELS.themeChanged, handler),
}

contextBridge.exposeInMainWorld('gulApi', api)
