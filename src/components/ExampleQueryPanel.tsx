import React from 'react'
import type { ExampleQuery } from '../core/types'

type Props = {
  examples: ExampleQuery[]
  onSelect: (sql: string) => void
}

export default function ExampleQueryPanel({ examples, onSelect }: Props) {
  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Example Queries</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {examples.map((ex) => (
          <button
            key={ex.id}
            onClick={() => onSelect(ex.sql)}
            aria-label={`Load example: ${ex.label}`}
            title={ex.sql}
            style={{ textAlign: 'left' }}
          >
            {ex.label}
          </button>
        ))}
      </div>
    </div>
  )
}
