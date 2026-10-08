import type { Options } from '../convert'

const LANGUAGES = [
  ['eng', 'English'],
  ['deu', 'German'],
]

interface Props {
  options: Options
  disabled: boolean
  onChange: (options: Options) => void
}

export default function OptionsPanel({ options, disabled, onChange }: Props) {
  const set = (patch: Partial<Options>) => onChange({ ...options, ...patch })
  return (
    <fieldset className="options" disabled={disabled}>
      <label>
        Output{' '}
        <select value={options.format} onChange={(e) => set({ format: e.target.value as Options['format'] })}>
          <option value="markdown">Markdown</option>
          <option value="text">Plain text</option>
        </select>
      </label>
      <label>
        <input
          type="checkbox"
          checked={options.removeHeadersFooters}
          onChange={(e) => set({ removeHeadersFooters: e.target.checked })}
        />{' '}
        Remove repeated headers and footers
      </label>
      <label>
        <input
          type="checkbox"
          checked={options.removePageNumbers}
          onChange={(e) => set({ removePageNumbers: e.target.checked })}
        />{' '}
        Remove page numbers
      </label>
      <label>
        Language of scanned pages{' '}
        <select value={options.ocrLang} onChange={(e) => set({ ocrLang: e.target.value })}>
          {LANGUAGES.map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </label>
    </fieldset>
  )
}
