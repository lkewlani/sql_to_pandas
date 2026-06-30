import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import SqlInputPanel from '../SqlInputPanel'

describe('SqlInputPanel', () => {
  it('renders textarea and button', () => {
    const html = renderToString(<SqlInputPanel sqlText="SELECT 1" setSqlText={() => {}} onSubmit={() => {}} />)
    expect(html).toContain('textarea')
    expect(html).toContain('Translate')
  })
})
