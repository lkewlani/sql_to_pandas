import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import ErrorSection from '../ErrorSection'

describe('ErrorSection', () => {
  it('renders errors list when provided', () => {
    const html = renderToString(<ErrorSection errors={[{ type: 'PARSE_ERROR', message: 'bad', token: 'X', lineNumber: 1 } as any]} />)
    expect(html).toContain('PARSE_ERROR')
    expect(html).toContain('bad')
  })
})
