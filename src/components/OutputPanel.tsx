import React from 'react'
import type { TranslationResult } from '../core/types'
import CopyButton from './CopyButton'
import ErrorSection from './ErrorSection'

type Props = {
  result: TranslationResult | null
}

export default function OutputPanel({ result }: Props) {
  if (!result) return null

  return (
    <div>
      <h3>Output</h3>
      {result.errors && result.errors.length > 0 && <ErrorSection errors={result.errors} />}

      {result.fullPandasCode && (
        <div>
          <pre style={{ background: '#f6f8fa', padding: 8 }}>
            <code>{result.fullPandasCode}</code>
          </pre>
          <CopyButton targetText={result.fullPandasCode} />
        </div>
      )}

      <div>
        {result.clauses.map((c, i) => (
          <section key={i} style={{ marginTop: 8 }}>
            <h4>{c.clauseType}</h4>
            <pre style={{ background: '#fff', padding: 6 }}><code>{c.pandasCode}</code></pre>
            <p>{c.explanation}</p>
          </section>
        ))}
      </div>
    </div>
  )
}
