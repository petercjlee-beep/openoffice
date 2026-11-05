import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

export default defineConfig({
  // @genoffice/i18n, @genoffice/electron-utils and @genoffice/gul-engine ship as TS source — must be bundled
  main: {
    plugins: [
      externalizeDepsPlugin({
        exclude: ['@genoffice/i18n', '@genoffice/electron-utils', '@genoffice/gul-engine'],
      }),
    ],
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: ['@genoffice/i18n', '@genoffice/electron-utils'] })],
  },
  renderer: {
    plugins: [react()],
    server: {
      port: Number(process.env.GUL_DEV_PORT) || 5182,
      strictPort: Boolean(process.env.GUL_DEV_PORT),
    },
  },
})
