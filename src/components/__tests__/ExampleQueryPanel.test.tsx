import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import ExampleQueryPanel from '../ExampleQueryPanel'

describe('ExampleQueryPanel', () => {
  it('renders example labels', () => {
    const examples = [{ id: 'a', label: 'One', sql: 'SELECT 1' }]
    const html = renderToString(<ExampleQueryPanel examples={examples} onSelect={() => {}} />)
    expect(html).toContain('One')
  })
})
