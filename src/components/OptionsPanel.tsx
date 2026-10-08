import type { Options } from '../convert'
import { LANGUAGES } from '../convert/ocr'

interface Props {
  options: Options
  disabled: boolean
  onChange: (options: Options) => void
}

const FORMATS: [Options['format'], string][] = [
  ['markdown', 'Markdown'],
  ['text', 'Plain text'],
]

export default function OptionsPanel({ options, disabled, onChange }: Props) {
  const set = (patch: Partial<Options>) => onChange({ ...options, ...patch })
  return (
    <fieldset className="card options" disabled={disabled}>
      <legend>Settings</legend>
      <div className="row">
        <span>Output</span>
        <div className="segmented">
          {FORMATS.map(([format, name]) => (
            <button key={format} type="button" aria-pressed={options.format === format} onClick={() => set({ format })}>
              {name}
            </button>
          ))}
        </div>
      </div>
      <label className="row">
        <span>Remove repeated headers and footers</span>
        <input
          className="switch"
          type="checkbox"
          checked={options.removeHeadersFooters}
          onChange={(e) => set({ removeHeadersFooters: e.target.checked })}
        />
      </label>
      <label className="row">
        <span>Remove page numbers</span>
        <input
          className="switch"
          type="checkbox"
          checked={options.removePageNumbers}
          onChange={(e) => set({ removePageNumbers: e.target.checked })}
        />
      </label>
      <label className="row">
        <span>Language of scanned pages</span>
        <select value={options.ocrLang} onChange={(e) => set({ ocrLang: e.target.value })}>
          <option value="auto">Auto-detect</option>
          {Object.entries(LANGUAGES).map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </label>
    </fieldset>
  )
}
