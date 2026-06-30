import React, { useEffect, useState } from 'react'

type Props = {
  sqlText: string
  setSqlText: (s: string) => void
  onSubmit: (s: string) => void
  isTranslating?: boolean
  validationMessage?: string | null
}

export default function SqlInputPanel({ sqlText, setSqlText, onSubmit, isTranslating = false, validationMessage = null }: Props) {
  const [charCount, setCharCount] = useState(sqlText.length)
  const [debounceTimer, setDebounceTimer] = useState<number | null>(null)

  useEffect(() => {
    // debounce updates to char counter for large pastes (100ms)
    if (debounceTimer) window.clearTimeout(debounceTimer)
    const id = window.setTimeout(() => setCharCount(sqlText.length), 100)
    setDebounceTimer(id)
    return () => window.clearTimeout(id)
  }, [sqlText])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSqlText(e.target.value)
  }

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    onSubmit(sqlText)
  }

  return (
    <form onSubmit={handleSubmit} aria-label="SQL input form">
      <label htmlFor="sql-input" style={{ display: 'block', fontWeight: 600, marginBottom: 6 }}>SQL Query</label>
      <textarea
        id="sql-input"
        rows={10}
        maxLength={10000}
        aria-label="SQL query input"
        aria-describedby="sql-input-help"
        value={sqlText}
        onChange={handleChange}
        disabled={isTranslating}
        style={{ width: '100%', fontFamily: 'inherit', fontSize: 14 }}
      />

      <div id="sql-input-help" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <div aria-live="polite">{validationMessage || ''}</div>
        <div>{charCount} / 10000</div>
      </div>

      <button type="submit" disabled={isTranslating || sqlText.trim().length === 0} style={{ marginTop: 8 }}>
        {isTranslating ? 'Translating…' : 'Translate'}
      </button>
    </form>
  )
}
