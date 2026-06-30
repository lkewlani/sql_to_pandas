import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderToString } from 'react-dom/server'
import CopyButton from '../CopyButton'

describe('CopyButton', () => {
  it('renders button', () => {
    const html = renderToString(<CopyButton targetText={'abc'} />)
    expect(html).toContain('Copy')
  })
})
