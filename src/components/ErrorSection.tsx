import React from 'react'
import type { TranslationError } from '../core/types'

type Props = {
  errors: TranslationError[]
}

export default function ErrorSection({ errors }: Props) {
  if (!errors || errors.length === 0) return null
  return (
    <aside role="alert" aria-live="assertive" style={{ background: '#fff4e5', padding: 8, borderRadius: 4 }}>
      <strong>Errors</strong>
      <ul>
        {errors.map((e, i) => (
          <li key={i}>
            <strong>{e.type}:</strong> {e.message} {e.clauseName ? `(${e.clauseName})` : ''}
          </li>
        ))}
      </ul>
    </aside>
  )
}
