import type { Item } from '../App'
import { AlertIcon, CheckIcon, CloseIcon, FileIcon } from './icons'

interface Props {
  items: Item[]
  selected: number | null
  running: boolean
  onSelect: (id: number) => void
  onRange: (id: number, range: string) => void
  onRemove: (id: number) => void
  onCancel: () => void
}

const STATUS = { ready: 'Ready', working: 'Converting', done: 'Done', error: 'Failed' }

const formatSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`

export default function FileQueue({ items, selected, running, onSelect, onRange, onRemove, onCancel }: Props) {
  return (
    <ul className="card queue">
      {items.map((item) => (
        <li key={item.id} className={item.id === selected ? 'selected' : undefined}>
          <span className="file-icon">
            <FileIcon />
          </span>
          <div className="file">
            <button className="name" disabled={!item.result} onClick={() => onSelect(item.id)}>
              {item.file.name}
            </button>
            <span className={`status ${item.status}`}>
              {item.status === 'done' && <CheckIcon />}
              {item.status === 'error' && <AlertIcon />}
              {STATUS[item.status]}
              {item.message && `: ${item.message}`}
            </span>
            {item.status === 'working' && (
              <div className="progress" role="progressbar" aria-valuenow={Math.round(item.progress * 100)}>
                <div style={{ width: `${item.progress * 100}%` }} />
              </div>
            )}
            <div className="file-meta">
              <span>{formatSize(item.file.size)}</span>
              <input
                aria-label={`Pages of ${item.file.name}`}
                placeholder="All pages, or 1-5, 8"
                value={item.range}
                disabled={running}
                onChange={(e) => onRange(item.id, e.target.value)}
              />
            </div>
          </div>
          {item.status === 'working' ? (
            <button className="ghost" onClick={onCancel}>
              Cancel
            </button>
          ) : (
            <button
              className="ghost icon"
              aria-label={`Remove ${item.file.name}`}
              disabled={running}
              onClick={() => onRemove(item.id)}
            >
              <CloseIcon />
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}
