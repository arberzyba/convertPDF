import { useState } from 'react'
import type { Result } from '../convert'
import { estimatePdfTokens, estimateTokens, IMAGE_TOKENS_PER_PAGE } from '../convert/tokens'
import { saveText } from '../download'

export default function ResultView({ name, result }: { name: string; result: Result }) {
  const [copied, setCopied] = useState(false)
  const tokens = estimateTokens(result.text)
  const pdfTokens = estimatePdfTokens(tokens, result.pages)
  const count = (n: number) => n.toLocaleString('en')

  async function copy() {
    await navigator.clipboard.writeText(result.text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <section className="result">
      <header>
        <h2>{name}</h2>
        <button onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
        <button onClick={() => saveText(name, result.text)}>Download</button>
      </header>
      <p>
        About <strong>{count(tokens)} tokens</strong>, against about {count(pdfTokens)} for the PDF itself (
        {Math.round((1 - tokens / pdfTokens) * 100)}% fewer).
        {result.ocrPages > 0 && ` ${result.ocrPages} of ${result.pages} pages were scans read with OCR.`}
      </p>
      <p className="note">
        Rough estimates: four characters per token, and {count(IMAGE_TOKENS_PER_PAGE)} tokens for the image of each
        page that models read alongside a PDF's text.
      </p>
      <textarea readOnly value={result.text} />
    </section>
  )
}
