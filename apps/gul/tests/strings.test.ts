import { describe, expect, it } from 'vitest'
import { LANGS } from '@genoffice/i18n'
import { strings } from '../src/renderer/i18n/strings'

describe('screen texts', () => {
  const keys = Object.keys(strings.zh).sort()

  it('are written in all 21 languages with the same keys', () => {
    expect(LANGS.length).toBe(21)
    for (const lang of LANGS) {
      expect(Object.keys(strings[lang]).sort(), lang).toEqual(keys)
    }
  })

  it('leave no text empty, and keep the placeholders where they are used', () => {
    for (const lang of LANGS) {
      for (const [key, text] of Object.entries(strings[lang])) {
        expect(text, `${lang}.${key}`).not.toBe('')
      }
      expect(strings[lang].saveFailed, lang).toContain('{error}')
      expect(strings[lang].page, lang).toContain('{n}')
    }
  })

  it('translate every text: only the English one may read as the English one', () => {
    for (const lang of LANGS) {
      if (lang === 'en') continue
      for (const key of keys) {
        const k = key as keyof typeof strings.en
        // French spells the page label as English does
        if (lang === 'fr' && key === 'page') continue
        expect(strings[lang][k], `${lang}.${key}`).not.toBe(strings.en[k])
      }
    }
  })
})

describe('placeholders', () => {
  it('use the single-brace form that format() fills, in every language', async () => {
    const { format } = await import('@genoffice/i18n')
    for (const lang of LANGS) {
      expect(format(strings[lang].page, { n: 3 }), lang).toMatch(/3/)
      expect(format(strings[lang].page, { n: 3 }), lang).not.toMatch(/[{}]/)
      expect(format(strings[lang].saveFailed, { error: 'E' }), lang).not.toMatch(/[{}]/)
    }
  })
})
