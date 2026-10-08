import type { Item } from '../App'

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

export default function FileQueue({ items, selected, running, onSelect, onRange, onRemove, onCancel }: Props) {
  return (
    <ul className="queue">
      {items.map((item) => (
        <li key={item.id} className={item.id === selected ? 'selected' : undefined}>
          <button className="name" disabled={!item.result} onClick={() => onSelect(item.id)}>
            {item.file.name}
          </button>
          <input
            aria-label={`Pages of ${item.file.name}`}
            placeholder="All pages, or 1-5, 8"
            value={item.range}
            disabled={running}
            onChange={(e) => onRange(item.id, e.target.value)}
          />
          <span className={`status ${item.status}`}>
            {STATUS[item.status]}
            {item.message && `: ${item.message}`}
          </span>
          {item.status === 'working' ? (
            <button onClick={onCancel}>Cancel</button>
          ) : (
            <button disabled={running} onClick={() => onRemove(item.id)}>
              Remove
            </button>
          )}
        </li>
      ))}
    </ul>
  )
}
