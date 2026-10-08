import JSZip from 'jszip'

function save(name: string, data: Blob) {
  const url = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

export function saveText(name: string, text: string) {
  save(name, new Blob([text], { type: 'text/plain;charset=utf-8' }))
}

export async function saveZip(files: { name: string; text: string }[]) {
  const zip = new JSZip()
  const used = new Set<string>()
  for (const { name, text } of files) {
    let unique = name
    for (let n = 2; used.has(unique); n++) unique = name.replace(/(\.\w+)$/, ` (${n})$1`)
    used.add(unique)
    zip.file(unique, text)
  }
  save('converted.zip', await zip.generateAsync({ type: 'blob' }))
}
