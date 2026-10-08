import { useState } from 'react'
import type { Result } from '../convert'
import { LANGUAGES } from '../convert/ocr'
import { estimatePdfTokens, estimateTokens, IMAGE_TOKENS_PER_PAGE } from '../convert/tokens'
import { saveText } from '../download'
import { CheckIcon, CopyIcon, DownloadIcon } from './icons'

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
    <section className="card result">
      <header>
        <div>
          <h2>{name}</h2>
          <p className="muted">
            {result.pages} {result.pages === 1 ? 'page' : 'pages'}
            {result.ocrPages > 0 &&
              `, ${result.ocrPages} read with OCR` +
                (LANGUAGES[result.ocrLang] ? ` as ${LANGUAGES[result.ocrLang]}` : '')}
          </p>
        </div>
        <button onClick={copy}>
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button className="primary" onClick={() => saveText(name, result.text)}>
          <DownloadIcon />
          Download
        </button>
      </header>
      <dl className="stats">
        <div>
          <dt>Tokens</dt>
          <dd>{count(tokens)}</dd>
        </div>
        <div>
          <dt>As a PDF</dt>
          <dd>{count(pdfTokens)}</dd>
        </div>
        <div className="saving">
          <dt>Saved</dt>
          <dd>{Math.round((1 - tokens / pdfTokens) * 100)}%</dd>
        </div>
      </dl>
      <textarea readOnly value={result.text} />
      <p className="note">
        Token counts are rough estimates: four characters per token, and {count(IMAGE_TOKENS_PER_PAGE)} tokens for the
        image of each page that models read alongside a PDF's text.
      </p>
    </section>
  )
}
