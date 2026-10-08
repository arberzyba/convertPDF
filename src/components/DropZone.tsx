import { useState } from 'react'
import { UploadIcon } from './icons'

export default function DropZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [over, setOver] = useState(false)
  return (
    <label
      className={over ? 'drop over' : 'drop'}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        onFiles([...e.dataTransfer.files])
      }}
    >
      <input
        className="visually-hidden"
        type="file"
        accept="application/pdf,.pdf"
        multiple
        onChange={(e) => {
          onFiles([...e.target.files!])
          e.target.value = ''
        }}
      />
      <span className="drop-icon">
        <UploadIcon />
      </span>
      <strong>Drop PDFs here</strong>
      <span>or click to choose files</span>
    </label>
  )
}
