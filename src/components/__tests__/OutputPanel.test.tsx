import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import OutputPanel from '../OutputPanel'

describe('OutputPanel', () => {
  it('renders fullPandasCode and clauses', () => {
    const res: any = {
      fullPandasCode: 'df.head(1)',
      clauses: [{ clauseType: 'SELECT', pandasCode: "df[['id']]", explanation: 'explain' }],
      errors: []
    }
    const html = renderToString(<OutputPanel result={res} />)
    expect(html).toContain('df.head(1)')
    expect(html).toContain('SELECT')
  })
})
