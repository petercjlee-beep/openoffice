import { useCallback, useEffect, useRef, useState } from 'react'
import type { GulOpenResult, GulParagraphView } from '../shared/ipc'
import { useI18n } from './i18n/locale'

type Loaded =
  | { state: 'loading' }
  | { state: 'refused'; reason: Extract<GulOpenResult, { status: 'refused' }>['reason'] }
  | { state: 'ready'; path: string }

/** `PAGE3` → 4th page, `Anchored Frame` → the frames' text; other parts are not listed */
function partHeading(part: string, t: ReturnType<typeof useI18n>['t']): string {
  const page = /^PAGE(\d+)$/.exec(part)
  if (page) return `${Number(page[1]) + 1} ${t('page')}`
  return t('frames')
}

function fileNameOf(path: string): string {
  return path.split(/[\\/]/).pop() ?? path
}

function AutoTextarea(props: {
  value: string
  onChange: (value: string) => void
}): React.JSX.Element {
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [props.value])
  return (
    <textarea
      ref={ref}
      className="gul-paragraph"
      rows={1}
      value={props.value}
      spellCheck={false}
      onChange={(e) => props.onChange(e.target.value.replace(/[\r\n]+/g, ' '))}
    />
  )
}

export default function App(): React.JSX.Element {
  const { t } = useI18n()
  const [loaded, setLoaded] = useState<Loaded>({ state: 'loading' })
  const [paragraphs, setParagraphs] = useState<GulParagraphView[]>([])
  const [dirty, setDirty] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  // the text of each paragraph as the main side holds it, to put back what it refused
  const accepted = useRef(new Map<number, string>())

  useEffect(() => {
    let alive = true
    void (async () => {
      const pending = await window.gulApi.consumePending()
      if (!pending) {
        if (alive) setLoaded({ state: 'refused', reason: 'unreadable' })
        return
      }
      const result = await window.gulApi.openFile(pending)
      if (!alive) return
      if (result.status === 'refused') {
        setLoaded({ state: 'refused', reason: result.reason })
        return
      }
      accepted.current = new Map(result.paragraphs.map((p) => [p.index, p.text]))
      setParagraphs(result.paragraphs)
      setLoaded({ state: 'ready', path: result.path })
    })()
    const stop = window.gulApi.onFileRenamed((path) =>
      setLoaded((now) => (now.state === 'ready' ? { state: 'ready', path } : now)),
    )
    return () => {
      alive = false
      stop()
    }
  }, [])

  const edit = useCallback(
    (index: number, text: string) => {
      setParagraphs((all) => all.map((p) => (p.index === index ? { ...p, text } : p)))
      setDirty(true)
      setMessage(null)
      void window.gulApi.setParagraph({ index, text }).then((result) => {
        if (result.ok) {
          accepted.current.set(index, text)
          return
        }
        const back = accepted.current.get(index) ?? ''
        setParagraphs((all) => all.map((p) => (p.index === index ? { ...p, text: back } : p)))
        setMessage(
          result.error === 'unencodable'
            ? t('cannotStore')
            : t('saveFailed', { error: result.error }),
        )
      })
    },
    [t],
  )

  const save = useCallback(
    async (mode: 'save' | 'saveAs') => {
      const result = await window.gulApi.save({ mode })
      if (!result.ok) {
        setMessage(
          result.error === 'external-modified'
            ? t('modified')
            : t('saveFailed', { error: result.error }),
        )
        return
      }
      if (result.canceled) return
      setDirty(false)
      setLoaded((now) => (now.state === 'ready' ? { state: 'ready', path: result.path } : now))
      setMessage(t('saved'))
    },
    [t],
  )

  if (loaded.state === 'loading') return <div className="gul-status">{t('loading')}</div>
  if (loaded.state === 'refused') {
    const key =
      loaded.reason === 'not-gul'
        ? 'refusedNotGul'
        : loaded.reason === 'unsupported'
          ? 'refusedUnsupported'
          : 'refusedUnreadable'
    return <div className="gul-status gul-refused">{t(key)}</div>
  }

  let lastPart = ''
  return (
    <div className="gul-app">
      <header className="gul-bar">
        <strong className="gul-name">{fileNameOf(loaded.path)}</strong>
        <span className="gul-state">{message ?? (dirty ? t('unsaved') : '')}</span>
        <button type="button" onClick={() => void save('save')} disabled={!dirty}>
          {t('save')}
        </button>
        <button type="button" onClick={() => void save('saveAs')}>
          {t('saveAs')}
        </button>
      </header>
      <p className="gul-note">{t('notePreview')}</p>
      <main className="gul-body">
        {paragraphs.length === 0 && <p className="gul-status">{t('empty')}</p>}
        {paragraphs.map((p) => {
          const heading = p.part !== lastPart ? partHeading(p.part, t) : null
          lastPart = p.part
          return (
            <div key={p.index}>
              {heading && <h2 className="gul-part">{heading}</h2>}
              <AutoTextarea value={p.text} onChange={(text) => edit(p.index, text)} />
            </div>
          )
        })}
      </main>
    </div>
  )
}
