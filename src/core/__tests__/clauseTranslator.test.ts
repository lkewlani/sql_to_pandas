import { describe, it, expect } from 'vitest'
import translateClause from '../clauseTranslator'

describe('clauseTranslator (scaffold)', () => {
  it('translates a simple SELECT projection', () => {
    const node: any = { type: 'SELECT', columns: ['id', 'name'], rawText: 'SELECT id, name' }
    const out = translateClause(node)
    expect(typeof out).toBe('string')
    expect(out.length).toBeGreaterThan(0)
    expect(out).toContain('df[[')
  })

  it('returns unsupported comment for unknown clause', () => {
    const node: any = { type: 'WINDOW', rawText: 'WINDOW ...' }
    const out = translateClause(node)
    expect(out).toContain('[UNSUPPORTED')
  })

  it('handles simple WHERE binary expression', () => {
    const node: any = {
      type: 'WHERE',
      condition: { type: 'binary_expr', operator: '=', left: { type: 'column_ref', column: 'age' }, right: { type: 'number', value: 30 } },
      rawText: 'WHERE age = 30'
    }
    const out = translateClause(node)
    expect(out).toContain("df[")
    expect(out).toContain('==')
  })
})
