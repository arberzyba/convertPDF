import { useState } from 'react'

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
      <strong>Drop PDFs here or click to choose</strong>
      <span>Files are converted in your browser and are never uploaded.</span>
    </label>
  )
}
