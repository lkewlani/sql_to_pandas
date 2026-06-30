import { describe, it, expect } from 'vitest'
import translateClause from '../clauseTranslator'

describe('clauseTranslator unit tests', () => {
  it('SELECT with * returns df', () => {
    const node: any = { type: 'SELECT', columns: ['*'], rawText: 'SELECT *' }
    const out = translateClause(node)
    expect(out).toBe('df')
  })

  it('SELECT with aliases handles column names', () => {
    const node: any = { type: 'SELECT', columns: [{ name: 'id', alias: 'identifier' }, { name: 'name' }], rawText: 'SELECT id AS identifier, name' }
    const out = translateClause(node)
    expect(out).toContain("'id'")
    expect(out).toContain("'name'")
  })

  it('WHERE with IS NULL translates to .isna()', () => {
    const node: any = { type: 'WHERE', condition: { type: 'unary_expr', operator: 'IS', left: { type: 'column_ref', column: 'col' }, right: { type: 'null', value: null } }, rawText: 'WHERE col IS NULL' }
    const out = translateClause(node)
    expect(out).toContain('.isna()')
  })

  it('WHERE IN translates to .isin()', () => {
    const node: any = { type: 'WHERE', condition: { type: 'in_expr', expr: { type: 'column_ref', column: 'status' }, val: [{ type: 'string', value: 'A' }, { type: 'string', value: 'B' }] }, rawText: "WHERE status IN ('A','B')" }
    const out = translateClause(node)
    expect(out).toContain('.isin(')
  })

  it('GROUP_BY with aggregates maps SUM->sum and COUNT->count', () => {
    const node: any = { type: 'GROUP_BY', groupBy: ['cat'], aggregates: [{ func: 'SUM', column: 'amt' }, { func: 'COUNT', column: 'id' }], rawText: 'GROUP BY cat' }
    const out = translateClause(node)
    expect(out).toContain("groupby")
    expect(out).toContain("'amt': 'sum'")
    expect(out).toContain("'id': 'count'")
  })

  it('ORDER_BY with mixed directions produces sort_values with correct ascending param', () => {
    const node: any = { type: 'ORDER_BY', orderBy: [{ column: 'a', direction: 'ASC' }, { column: 'b', direction: 'DESC' }], rawText: 'ORDER BY a ASC, b DESC' }
    const out = translateClause(node)
    expect(out).toContain('sort_values')
    expect(out).toContain('ascending')
  })

  it('LIMIT produces head(n)', () => {
    const node: any = { type: 'LIMIT', limit: 10, rawText: 'LIMIT 10' }
    const out = translateClause(node)
    expect(out).toContain('head(10)')
  })

  it('DISTINCT produces drop_duplicates()', () => {
    const node: any = { type: 'DISTINCT', rawText: 'SELECT DISTINCT col' }
    const out = translateClause(node)
    expect(out).toContain('drop_duplicates')
  })

  it('JOIN returns pd.merge template including how', () => {
    const node: any = { type: 'JOIN', joinType: 'LEFT', rawText: 'LEFT JOIN t2 ON t1.id = t2.id' }
    const out = translateClause(node)
    expect(out).toContain("pd.merge")
    expect(out).toContain("how='left'")
  })

  it('SUBQUERY_FROM returns a subquery comment and placeholder assignment', () => {
    const node: any = { type: 'SUBQUERY_FROM', rawText: 'FROM (SELECT id FROM t2) sub' }
    const out = translateClause(node)
    expect(out).toContain('[SUBQUERY_FROM]')
    expect(out).toContain('sub_df')
  })
})
