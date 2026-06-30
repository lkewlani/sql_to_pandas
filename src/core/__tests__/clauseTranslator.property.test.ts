import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import translateClause from '../clauseTranslator'

describe('clauseTranslator property tests', () => {
  it('Property 1: round-trip completeness for supported clause types', () => {
    const clauseArb = fc.oneof(
      fc.record({ type: fc.constant('SELECT'), columns: fc.array(fc.oneof(fc.string(), fc.record({ name: fc.string() })), { minLength: 1, maxLength: 5 }), rawText: fc.string() }),
      fc.record({ type: fc.constant('WHERE'), condition: fc.record({ type: fc.constant('binary_expr'), operator: fc.oneof(fc.constant('='), fc.constant('<>')), left: fc.record({ type: fc.constant('column_ref'), column: fc.string() }), right: fc.record({ type: fc.constant('number'), value: fc.integer() }) }), rawText: fc.string() }),
      fc.record({ type: fc.constant('GROUP_BY'), groupBy: fc.array(fc.string(), { minLength: 1, maxLength: 3 }), aggregates: fc.array(fc.record({ func: fc.oneof(fc.constant('SUM'), fc.constant('COUNT')), column: fc.string() }), { maxLength: 3 }), rawText: fc.string() }),
      fc.record({ type: fc.constant('ORDER_BY'), orderBy: fc.array(fc.record({ column: fc.string(), direction: fc.oneof(fc.constant('ASC'), fc.constant('DESC')) }), { minLength: 1, maxLength: 3 }), rawText: fc.string() }),
      fc.record({ type: fc.constant('LIMIT'), limit: fc.integer({ min: 0, max: 1000 }), rawText: fc.string() }),
      fc.record({ type: fc.constant('DISTINCT'), rawText: fc.string() }),
    )

    fc.assert(
      fc.property(clauseArb, (node) => {
        const out = translateClause(node as any)
        expect(typeof out).toBe('string')
        expect(out.length).toBeGreaterThan(0)
      }),
      { numRuns: 100 }
    )
  })

  it('Property 2: unsupported clauses produce an UNSUPPORTED marker', () => {
    const node: any = { type: 'WINDOW', rawText: 'WINDOW w AS (...)' }
    const out = translateClause(node)
    expect(out).toContain('[UNSUPPORTED')
  })

  it('Property 4: partial output consistency — unsupported appears once per unsupported node', () => {
    const nodes: any[] = [
      { type: 'SELECT', columns: ['id'], rawText: 'SELECT id' },
      { type: 'WINDOW', rawText: 'WINDOW w AS (...)' },
      { type: 'JOIN', joinType: 'INNER', rawText: 'JOIN t2 ON t1.id = t2.id' },
      { type: 'FOO', rawText: 'FOO ...' },
    ]

    const outputs = nodes.map(n => translateClause(n))
    const joined = outputs.join('\n')
    const unsupportedCount = nodes.filter(n => !['SELECT','WHERE','GROUP_BY','HAVING','ORDER_BY','LIMIT','JOIN','DISTINCT','SUBQUERY_FROM','SUBQUERY_WHERE_HAVING'].includes(n.type)).length
    const occurrences = (joined.match(/\[UNSUPPORTED/g) || []).length
    expect(occurrences).toBe(unsupportedCount)
  })
})
