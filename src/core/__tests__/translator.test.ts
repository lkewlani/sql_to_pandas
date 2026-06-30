import { describe, it, expect } from 'vitest'
import { translate } from '../translator'

describe('translator orchestration', () => {
  it('returns errors for empty input', () => {
    const res = translate('   ')
    expect(res.success).toBe(false)
    expect(res.errors.length).toBeGreaterThan(0)
  })

  it('translates a simple SELECT query', () => {
    const sql = 'SELECT id, name FROM users WHERE age = 30'
    const res = translate(sql)
    expect(res.clauses.length).toBeGreaterThan(0)
    expect(res.fullPandasCode.length).toBeGreaterThan(0)
  })
})
