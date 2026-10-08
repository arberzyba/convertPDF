import { useRef, useState } from 'react'
import DropZone from './components/DropZone'
import FileQueue from './components/FileQueue'
import { DownloadIcon, FileIcon, LockIcon } from './components/icons'
import OptionsPanel from './components/OptionsPanel'
import ResultView from './components/ResultView'
import { convertPdf, type Options, type Result } from './convert'
import { stopOcr } from './convert/ocr'
import { saveZip } from './download'

export interface Item {
  id: number
  file: File
  range: string
  status: 'ready' | 'working' | 'done' | 'error'
  message: string
  /** Share of the pages converted so far, from 0 to 1. */
  progress: number
  result?: Result
}

let nextId = 1

const LARGE_FILE = 50 * 1024 * 1024

const outputName = (item: Item) =>
  item.file.name.replace(/\.pdf$/i, '') + (item.result!.format === 'markdown' ? '.md' : '.txt')

export default function App() {
  const [items, setItems] = useState<Item[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [running, setRunning] = useState(false)
  const [options, setOptions] = useState<Options>({
    format: 'markdown',
    removeHeadersFooters: true,
    removePageNumbers: true,
    ocrLang: 'auto',
  })
  const abort = useRef<AbortController | null>(null)

  const update = (id: number, patch: Partial<Item>) =>
    setItems((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)))

  function addFiles(files: File[]) {
    const pdfs = files.filter((file) => file.type === 'application/pdf' || /\.pdf$/i.test(file.name))
    setItems((items) => [
      ...items,
      ...pdfs.map((file): Item => {
        const message = file.size > LARGE_FILE ? 'large file, conversion may be slow' : ''
        return { id: nextId++, file, range: '', status: 'ready', message, progress: 0 }
      }),
    ])
  }

  async function convertAll() {
    setRunning(true)
    for (const item of items) {
      const controller = new AbortController()
      abort.current = controller
      update(item.id, { status: 'working', message: 'Opening', progress: 0, result: undefined })
      try {
        const progress = (message: string, progress: number) => update(item.id, { message, progress })
        const result = await convertPdf(item.file, item.range, options, progress, controller.signal)
        update(item.id, { status: 'done', message: '', result })
        setSelected((selected) => selected ?? item.id)
      } catch (error) {
        if (controller.signal.aborted) update(item.id, { status: 'ready', message: 'cancelled' })
        else update(item.id, { status: 'error', message: error instanceof Error ? error.message : String(error) })
      }
    }
    await stopOcr()
    setRunning(false)
  }

  const done = items.filter((item) => item.result)
  const shown = done.find((item) => item.id === selected)

  return (
    <>
      <header className="top">
        <span className="logo">
          <FileIcon />
        </span>
        <div>
          <h1>PDF to Markdown</h1>
          <p>Turn PDFs into Markdown or plain text that costs far fewer tokens in AI models.</p>
        </div>
        <span className="badge">
          <LockIcon />
          Files never leave your browser
        </span>
      </header>
      <main>
        <div className="side">
          <DropZone onFiles={addFiles} />
          <OptionsPanel options={options} disabled={running} onChange={setOptions} />
          {items.length > 0 && (
            <>
              <FileQueue
                items={items}
                selected={selected}
                running={running}
                onSelect={setSelected}
                onRange={(id, range) => update(id, { range })}
                onRemove={(id) => setItems((items) => items.filter((item) => item.id !== id))}
                onCancel={() => abort.current?.abort()}
              />
              <div className="actions">
                <button className="primary convert" disabled={running} onClick={convertAll}>
                  {running ? 'Converting…' : `Convert ${items.length} ${items.length === 1 ? 'file' : 'files'}`}
                </button>
                {done.length > 1 && (
                  <button
                    onClick={() => saveZip(done.map((item) => ({ name: outputName(item), text: item.result!.text })))}
                  >
                    <DownloadIcon />
                    Download all as zip
                  </button>
                )}
              </div>
            </>
          )}
        </div>
        {shown ? (
          <ResultView name={outputName(shown)} result={shown.result!} />
        ) : (
          <section className="card empty">
            <FileIcon />
            <strong>Nothing converted yet</strong>
            <span>Add PDFs and press Convert. The text appears here, ready to copy or download.</span>
          </section>
        )}
      </main>
    </>
  )
}
