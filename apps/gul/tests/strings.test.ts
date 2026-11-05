import { describe, expect, it } from 'vitest'
import { LANGS } from '@genoffice/i18n'
import { strings } from '../src/renderer/i18n/strings'

describe('screen texts', () => {
  const keys = Object.keys(strings.zh).sort()

  it('write the same keys in Korean, English and Chinese', () => {
    for (const lang of ['ko', 'en'] as const) {
      expect(Object.keys(strings[lang]).sort(), lang).toEqual(keys)
    }
  })

  it('leave no text empty, and keep the {{error}} placeholder where it is used', () => {
    for (const lang of ['zh', 'en', 'ko'] as const) {
      for (const [key, text] of Object.entries(strings[lang])) {
        expect(text, `${lang}.${key}`).not.toBe('')
      }
      expect(strings[lang].saveFailed).toContain('{{error}}')
    }
  })

  it('the languages not written yet are the open item recorded in findings', () => {
    const written = ['zh', 'en', 'ko']
    expect(LANGS.filter((code) => !written.includes(code)).length).toBeGreaterThan(0)
  })
})
