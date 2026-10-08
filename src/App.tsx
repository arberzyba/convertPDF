import { useRef, useState } from 'react'
import DropZone from './components/DropZone'
import FileQueue from './components/FileQueue'
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
        return { id: nextId++, file, range: '', status: 'ready', message }
      }),
    ])
  }

  async function convertAll() {
    setRunning(true)
    for (const item of items) {
      const controller = new AbortController()
      abort.current = controller
      update(item.id, { status: 'working', message: 'Opening', result: undefined })
      try {
        const progress = (message: string) => update(item.id, { message })
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
    <main>
      <h1>PDF to Markdown</h1>
      <p>Turn PDFs into Markdown or plain text, so they cost far fewer tokens when you give them to an AI model.</p>
      <DropZone onFiles={addFiles} />
      {items.length > 0 && (
        <>
          <OptionsPanel options={options} disabled={running} onChange={setOptions} />
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
            <button className="primary" disabled={running} onClick={convertAll}>
              {running ? 'Converting…' : 'Convert'}
            </button>
            {done.length > 1 && (
              <button onClick={() => saveZip(done.map((item) => ({ name: outputName(item), text: item.result!.text })))}>
                Download all as zip
              </button>
            )}
          </div>
        </>
      )}
      {shown && <ResultView name={outputName(shown)} result={shown.result!} />}
    </main>
  )
}
