import type { TranslationResult, ClauseOutput, ClauseNode } from './types'
import { validateInput } from './inputValidator'
import { parseSQL } from './sqlParser'
import translateClause from './clauseTranslator'
import { getExplanation } from './explanationGenerator'
import { buildErrorList } from './errorHandler'

const SUPPORTED: string[] = [
  'SELECT','WHERE','GROUP_BY','HAVING','ORDER_BY','LIMIT','JOIN','DISTINCT','SUBQUERY_FROM','SUBQUERY_WHERE_HAVING'
]

/**
 * Orchestrator: runs the full translation pipeline for a SQL query.
 */
export function translate(sqlText: string): TranslationResult {
  // 1. Validate input
  const validation = validateInput(sqlText)
  if (!validation.valid) {
    const errors = buildErrorList(undefined, [], validation.error)
    return {
      success: false,
      clauses: [],
      fullPandasCode: '',
      errors,
      hasPartialOutput: false,
    }
  }

  // 2. Parse
  let ast
  try {
    ast = parseSQL(sqlText)
  } catch (err: unknown) {
    // parse error
    const parseError = err as any
    const errors = buildErrorList(parseError, undefined, undefined)
    return {
      success: false,
      clauses: [],
      fullPandasCode: '',
      errors,
      hasPartialOutput: false,
    }
  }

  // If parser returned no clauses and reported unsupported constructs, surface those errors
  if (!ast.clauses || ast.clauses.length === 0) {
    const errors = buildErrorList(undefined, ast.unsupported || [], undefined)
    return {
      success: false,
      clauses: [],
      fullPandasCode: '',
      errors,
      hasPartialOutput: false,
    }
  }

  // 3. Translate each clause
  const clauseOutputs: ClauseOutput[] = ast.clauses.map((c: ClauseNode) => {
    const pandasCode = translateClause(c as any)
    const explanation = SUPPORTED.includes(c.type) ? getExplanation(c.type as any) : ''
    return {
      clauseType: c.type as any,
      pandasCode,
      explanation,
    }
  })

  // 4. Determine partial output: at least one translated and at least one unsupported
  const translatedCount = clauseOutputs.filter(co => !co.pandasCode.startsWith('# [UNSUPPORTED')).length
  const unsupportedCount = clauseOutputs.length - translatedCount + (ast.unsupported?.length ?? 0)
  const hasPartialOutput = translatedCount > 0 && unsupportedCount > 0

  // 5. Assemble fullPandasCode in logical pandas execution order
  const orderRank: Record<string, number> = {
    'SUBQUERY_FROM': 0,
    'JOIN': 1,
    'WHERE': 2,
    'GROUP_BY': 3,
    'HAVING': 4,
    'SELECT': 5,
    'DISTINCT': 6,
    'ORDER_BY': 7,
    'LIMIT': 8,
    'SUBQUERY_WHERE_HAVING': 9,
  }

  const sorted = [...clauseOutputs].sort((a, b) => {
    const ra = orderRank[a.clauseType] ?? 99
    const rb = orderRank[b.clauseType] ?? 99
    return ra - rb
  })

  const fullPandasCode = sorted.map(s => s.pandasCode).join('\n')

  // 6. Build errors list including parser-detected unsupported constructs
  const errors = buildErrorList(undefined, ast.unsupported || [], undefined)

  return {
    success: !hasPartialOutput && errors.length === 0,
    clauses: clauseOutputs,
    fullPandasCode,
    errors,
    hasPartialOutput,
  }
}

export default translate
