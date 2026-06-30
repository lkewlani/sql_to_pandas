import { ClauseNode } from './types'

// Core clause translator: produce pandas code fragment for a given ClauseNode.
export function translateClause(node: ClauseNode): string {
  const n: any = node
  const t = n.type

  if (!t) return '# [UNSUPPORTED: UNKNOWN_CLAUSE]'

  switch (t) {
    case 'SELECT': {
      const cols: any[] = n.columns || guessSelectColumns(n)
      if (!cols || cols.length === 0) return "# [UNSUPPORTED: SELECT_COLUMNS_MISSING]"
      if (cols.length === 1 && cols[0] === '*') return 'df'
      const colNames = cols.map(c => (typeof c === 'string' ? c : c.name || String(c))).map(s => `'${s}'`)
      return `df[[${colNames.join(', ')}]]`
    }

    case 'WHERE': {
      const cond = n.condition
      if (!cond) return "# [UNSUPPORTED: WHERE_CONDITION_MISSING]"
      return `df[ ${translateCondition(cond)} ]`
    }

    case 'GROUP_BY': {
      const groupCols: string[] = n.groupBy || n.columns || []
      const aggs: any[] = n.aggregates || n.agg || []
      if (groupCols.length === 0) return "# [UNSUPPORTED: GROUP_BY_NO_COLUMNS]"
      // build agg mapping: if no aggregates, just groupby + size()
      if (!aggs || aggs.length === 0) {
        return `df.groupby([${groupCols.map(c => `'${c}'`).join(', ')}]).size().reset_index(name='count')`
      }
      const aggMap = aggs.map(a => {
        // a can be { func: 'SUM', column: 'x', alias: 'total' }
        const func = (a.func || a.name || a.aggregate || '').toLowerCase()
        const col = a.column || a.arg || (a.expr && a.expr.column) || 'UNKNOWN'
        return `'${col}': '${mapAggFunc(func)}'`
      }).join(', ')
      return `df.groupby([${groupCols.map(c => `'${c}'`).join(', ')}]).agg({ ${aggMap} }).reset_index()`
    }

    case 'HAVING': {
      // HAVING applies to aggregated result; assume child provides grouped df variable `grp`
      const cond = n.condition
      if (!cond) return "# [UNSUPPORTED: HAVING_CONDITION_MISSING]"
      return `grp[ ${translateCondition(cond)} ]  # apply HAVING filter on grouped result`
    }

    case 'ORDER_BY': {
      const order: any[] = n.orderBy || n.orders || []
      if (!order || order.length === 0) return "# [UNSUPPORTED: ORDER_BY_NO_COLUMNS]"
      const cols = order.map(o => `'${o.column || o.col || o}'`).join(', ')
      const asc = order.map(o => (o.direction ? (String(o.direction).toUpperCase() === 'ASC') : true))
      const ascParam = asc.length === 1 ? String(asc[0]) : `[${asc.join(', ')}]`
      return `df.sort_values(by=[${cols}], ascending=${ascParam})`
    }

    case 'LIMIT': {
      const nVal = n.limit || n.count || (n.tokens && Number(n.tokens[n.tokens.length - 1]))
      return `head(${nVal ?? '0'})`
    }

    case 'JOIN': {
      const how = (n.joinType || n.typeDetail || 'INNER').toLowerCase()
      // best-effort: provide merge template; user must replace left/right and keys
      return `pd.merge(left_df, right_df, how='${how}', on=[/* join keys */])  # replace left_df/right_df and keys as needed`
    }

    case 'DISTINCT':
      return `df.drop_duplicates()`

    case 'SUBQUERY_FROM':
      return `# [SUBQUERY_FROM] ${escapeInlineComment(n.rawText || '')}\nsub_df = /* translate subquery result */`;

    case 'SUBQUERY_WHERE_HAVING':
      return `# [SUBQUERY_WHERE_HAVING] ${escapeInlineComment(n.rawText || '')}`

    default:
      return `# [UNSUPPORTED: ${t}]`
  }
}

function translateCondition(cond: any): string {
  if (!cond) return 'True'
  // support binary expressions and logical chains
  if (cond.type === 'binary_expr') {
    const left = extractTerm(cond.left)
    const right = extractTerm(cond.right)
    const op = mapOperator(cond.operator)
    return `${left} ${op} ${right}`
  }
  if (cond.type === 'unary_expr' && cond.operator === 'IS' && cond.right && cond.right.type === 'null') {
    return `${extractTerm(cond.left)}.isna()`
  }
  if (cond.type === 'in_expr') {
    const left = extractTerm(cond.expr)
    const items = (cond.val || cond.list || []).map((v: any) => extractTerm(v)).join(', ')
    return `${left}.isin([${items}])`
  }
  if (cond.operator && (cond.operator === 'AND' || cond.operator === 'OR')) {
    const parts = (cond.args || cond.clauses || []).map((c: any) => `(${translateCondition(c)})`).join(cond.operator === 'AND' ? ' & ' : ' | ')
    return parts || 'True'
  }
  return 'True'
}

function extractTerm(term: any): string {
  if (!term) return 'None'
  if (term.type === 'column_ref') return `df['${term.column}']`
  if (term.type === 'number') return String(term.value)
  if (term.type === 'string') return JSON.stringify(term.value)
  if (term.type === 'bool') return String(Boolean(term.value))
  if (typeof term === 'string') return `df['${term}']`
  if (term.value !== undefined) return String(term.value)
  return String(term)
}

function mapOperator(op: string): string {
  if (!op) return '=='
  switch (op.toUpperCase()) {
    case '=': case '==': return '=='
    case '<>': case '!=': return '!='
    case 'AND': return '&'
    case 'OR': return '|'
    case 'LIKE': return ".str.contains" // caller must handle parentheses
    default: return op
  }
}

function mapAggFunc(f: string): string {
  if (!f) return 'sum'
  switch (f.toLowerCase()) {
    case 'count': return 'count'
    case 'sum': return 'sum'
    case 'avg': case 'mean': return 'mean'
    case 'min': return 'min'
    case 'max': return 'max'
    default: return 'sum'
  }
}

function guessSelectColumns(n: any): string[] {
  // best-effort parse of rawText: grab tokens after SELECT and before FROM
  const raw: string = n.rawText || n.raw || ''
  const m = raw.match(/select\s+([\s\S]+?)\s+from/i)
  if (!m) return []
  return m[1].split(',').map((s: string) => s.trim().replace(/\s+as\s+.*$/i, '').replace(/[`"\[\]]/g, ''))
}

function escapeInlineComment(s: string): string {
  return s.replace(/\n/g, ' ').replace(/\r/g, ' ')
}

export default translateClause
