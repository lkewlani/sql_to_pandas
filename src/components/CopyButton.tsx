import React, { useState } from 'react'

type Props = {
  targetText: string
}

export default function CopyButton({ targetText }: Props) {
  const [status, setStatus] = useState<'idle'|'copied'|'error'>('idle')

  const handleCopy = async () => {
    if (!targetText) return
    try {
      await navigator.clipboard.writeText(targetText)
      setStatus('copied')
      setTimeout(() => setStatus('idle'), 2000)
    } catch (err) {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  return (
    <div>
      <button onClick={handleCopy} disabled={!targetText} aria-disabled={!targetText}>
        Copy
      </button>
      {status === 'copied' && <span aria-live="polite">Copied!</span>}
      {status === 'error' && <span role="alert">Copy failed — select the code and copy manually.</span>}
    </div>
  )
}
