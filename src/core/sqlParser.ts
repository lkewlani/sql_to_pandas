/**
 * SQL Parser — wraps `node-sql-parser` to produce a `SqlAST`.
 *
 * Responsibilities:
 * - Tokenise raw SQL using node-sql-parser's `Parser` class.
 * - Map the resulting AST into an array of `ClauseNode` values for all
 *   supported `ClauseType` values.
 * - Populate `unsupported[]` for constructs the translator cannot handle
 *   (CTEs, UNION, window functions, PIVOT, stored procedures).
 * - Throw a structured `ParseError` on parse failure.
 */

import { Parser } from 'node-sql-parser';
import { ClauseNode, ClauseType, ParseError, SqlAST } from './types';

// ---------------------------------------------------------------------------
// Internal helpers — node-sql-parser AST shape definitions
// ---------------------------------------------------------------------------

/** Minimal typing for column expressions returned by node-sql-parser. */
interface NSPColumnRef {
  type: 'column_ref';
  table: string | null;
  column: string | { expr: { type: string; value: string } };
}

interface NSPStar {
  type: 'star';
  value: '*';
}

interface NSPAggrFunc {
  type: 'aggr_func';
  name: string;               // COUNT, SUM, AVG, MIN, MAX
  args: { expr: NSPExpr };
}

interface NSPFunction {
  type: 'function';
  name: string;
  args?: { value: NSPExpr[] };
  over?: unknown; // window function OVER clause
}

interface NSPBinaryExpr {
  type: 'binary_expr';
  operator: string;
  left: NSPExpr;
  right: NSPExpr;
}

type NSPExpr =
  | NSPColumnRef
  | NSPStar
  | NSPAggrFunc
  | NSPFunction
  | NSPBinaryExpr
  | { type: string; value: unknown };

interface NSPSelectColumn {
  expr: NSPExpr;
  as: string | null;
}

interface NSPTable {
  table?: string;
  db?: string | null;
  as?: string | null;
  expr?: {               // subquery in FROM
    ast?: NSPSelectStmt;
    statement?: NSPSelectStmt;
  };
  join?: string;         // join type e.g. "INNER JOIN"
  on?: NSPExpr;          // ON condition
}

interface NSPGroupByItem {
  type: string;
  value?: unknown;
  column?: string;
  table?: string | null;
}

interface NSPOrderByItem {
  expr: NSPExpr;
  type: 'ASC' | 'DESC';
}

interface NSPLimit {
  seperator: string;
  value: Array<{ type: string; value: number }>;
}

interface NSPSelectStmt {
  type: 'select';
  distinct?: string | null;   // 'DISTINCT' or null
  columns: NSPSelectColumn[] | '*';
  from: NSPTable[] | null;
  where: NSPExpr | null;
  groupby: NSPGroupByItem[] | null;
  having: NSPExpr | null;
  orderby: NSPOrderByItem[] | null;
  limit: NSPLimit | null;
  with?: unknown[];            // CTEs
  _next?: NSPSelectStmt;      // UNION / INTERSECT / EXCEPT chaining
  set_op?: string;            // 'union' | 'intersect' | 'except'
}

// ---------------------------------------------------------------------------
// Unsupported construct detection
// ---------------------------------------------------------------------------

/**
 * Walk an expression tree and return true if any node is a window function
 * (has an `over` property or name matches known window functions).
 */
function exprContainsWindowFunction(expr: NSPExpr | null | undefined): boolean {
  if (!expr) return false;
  if (expr.type === 'function') {
    const fn = expr as NSPFunction;
    if (fn.over !== undefined && fn.over !== null) return true;
    // Some parsers expose window functions differently
    const windowFns = new Set([
      'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'NTILE', 'LAG', 'LEAD',
      'FIRST_VALUE', 'LAST_VALUE', 'NTH_VALUE', 'CUME_DIST', 'PERCENT_RANK',
    ]);
    if (windowFns.has(fn.name?.toUpperCase())) return true;
    if (fn.args?.value) {
      return fn.args.value.some(exprContainsWindowFunction);
    }
  }
  if (expr.type === 'binary_expr') {
    const be = expr as NSPBinaryExpr;
    return exprContainsWindowFunction(be.left) || exprContainsWindowFunction(be.right);
  }
  if (expr.type === 'aggr_func') {
    const af = expr as NSPAggrFunc;
    return exprContainsWindowFunction(af.args?.expr);
  }
  return false;
}

/**
 * Check the columns list for window functions.
 */
function columnsContainWindowFunction(
  columns: NSPSelectColumn[] | '*',
): boolean {
  if (columns === '*') return false;
  return columns.some((c) => exprContainsWindowFunction(c.expr));
}

// ---------------------------------------------------------------------------
// rawText helpers — reconstruct a readable SQL fragment for each clause
// ---------------------------------------------------------------------------

function columnExprToText(expr: NSPExpr): string {
  if (!expr) return '';
  switch (expr.type) {
    case 'star':
      return '*';
    case 'column_ref': {
      const cr = expr as NSPColumnRef;
      const col =
        typeof cr.column === 'object' && cr.column !== null
          ? cr.column.expr?.value ?? String(cr.column)
          : String(cr.column ?? '');
      return cr.table ? `${cr.table}.${col}` : col;
    }
    case 'aggr_func': {
      const af = expr as NSPAggrFunc;
      const argText = af.args?.expr ? columnExprToText(af.args.expr) : '*';
      return `${af.name}(${argText})`;
    }
    case 'function': {
      const fn = expr as NSPFunction;
      const args = fn.args?.value?.map(columnExprToText).join(', ') ?? '';
      return `${fn.name}(${args})`;
    }
    case 'binary_expr': {
      const be = expr as NSPBinaryExpr;
      return `${columnExprToText(be.left)} ${be.operator} ${columnExprToText(be.right)}`;
    }
    default:
      return String((expr as { value?: unknown }).value ?? '');
  }
}

function columnsToText(columns: NSPSelectColumn[] | '*'): string {
  if (columns === '*') return '*';
  return columns
    .map((c) => {
      const base = columnExprToText(c.expr);
      return c.as ? `${base} AS ${c.as}` : base;
    })
    .join(', ');
}

function exprToText(expr: NSPExpr | null | undefined): string {
  if (!expr) return '';
  return columnExprToText(expr);
}

function groupByToText(groupby: NSPGroupByItem[]): string {
  return groupby
    .map((g) => {
      if (g.type === 'column_ref') {
        const t = (g as unknown as NSPColumnRef).table;
        const c = (g as unknown as NSPColumnRef).column;
        const col = typeof c === 'object' && c !== null ? c.expr?.value ?? '' : String(c ?? '');
        return t ? `${t}.${col}` : col;
      }
      return String(g.value ?? '');
    })
    .join(', ');
}

function orderByToText(orderby: NSPOrderByItem[]): string {
  return orderby
    .map((o) => `${columnExprToText(o.expr)} ${o.type}`)
    .join(', ');
}

// ---------------------------------------------------------------------------
// Token extraction helpers
// ---------------------------------------------------------------------------

function tokeniseText(text: string): string[] {
  return text
    .replace(/[(),]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

// ---------------------------------------------------------------------------
// ClauseNode builders
// ---------------------------------------------------------------------------

function buildSelectClause(
  stmt: NSPSelectStmt,
): ClauseNode {
  const text = columnsToText(stmt.columns);
  return {
    type: 'SELECT',
    rawText: `SELECT ${text}`,
    tokens: tokeniseText(text),
  };
}

function buildDistinctClause(
  stmt: NSPSelectStmt,
): ClauseNode {
  const text = columnsToText(stmt.columns);
  return {
    type: 'DISTINCT',
    rawText: `SELECT DISTINCT ${text}`,
    tokens: tokeniseText(text),
  };
}

function buildWhereClause(where: NSPExpr): ClauseNode {
  const text = exprToText(where);
  return {
    type: 'WHERE',
    rawText: `WHERE ${text}`,
    tokens: tokeniseText(text),
  };
}

function buildGroupByClause(groupby: NSPGroupByItem[]): ClauseNode {
  const text = groupByToText(groupby);
  return {
    type: 'GROUP_BY',
    rawText: `GROUP BY ${text}`,
    tokens: tokeniseText(text),
  };
}

function buildHavingClause(having: NSPExpr): ClauseNode {
  const text = exprToText(having);
  return {
    type: 'HAVING',
    rawText: `HAVING ${text}`,
    tokens: tokeniseText(text),
  };
}

function buildOrderByClause(orderby: NSPOrderByItem[]): ClauseNode {
  const text = orderByToText(orderby);
  return {
    type: 'ORDER_BY',
    rawText: `ORDER BY ${text}`,
    tokens: tokeniseText(text),
  };
}

function buildLimitClause(limit: NSPLimit): ClauseNode {
  const val = limit.value?.[0]?.value ?? limit.value?.[1]?.value ?? 0;
  const text = String(val);
  return {
    type: 'LIMIT',
    rawText: `LIMIT ${text}`,
    tokens: [text],
  };
}

// ---------------------------------------------------------------------------
// JOIN clause builder — handles one or more join entries in stmt.from[]
// ---------------------------------------------------------------------------

function buildJoinClauses(from: NSPTable[]): ClauseNode[] {
  const joinClauses: ClauseNode[] = [];
  // from[0] is the base table; from[1..n] are joins
  for (let i = 1; i < from.length; i++) {
    const f = from[i];
    if (!f.join) continue;
    const joinType = f.join.toUpperCase();
    const tableName = f.table ?? 'subquery';
    const alias = f.as ? ` AS ${f.as}` : '';
    const onText = f.on ? ` ON ${exprToText(f.on)}` : '';
    const rawText = `${joinType} ${tableName}${alias}${onText}`;
    joinClauses.push({
      type: 'JOIN',
      rawText,
      tokens: tokeniseText(rawText),
    });
  }
  return joinClauses;
}

// ---------------------------------------------------------------------------
// Subquery detection and ClauseNode builders
// ---------------------------------------------------------------------------

/**
 * Returns true if any table entry in `from` is a subquery (not a plain table).
 */
function fromContainsSubquery(from: NSPTable[]): boolean {
  return from.some((f) => !f.join && (f.expr !== undefined));
}

/**
 * Returns true if the WHERE or HAVING expression contains a subquery.
 * node-sql-parser represents subqueries in WHERE as { type: 'expr_list' } or
 * as a binary_expr whose right side has type 'select'.
 */
function exprContainsSubquery(expr: NSPExpr | null | undefined): boolean {
  if (!expr) return false;
  const t = (expr as { type?: string }).type;
  if (t === 'select') return true;
  if (t === 'binary_expr') {
    const be = expr as NSPBinaryExpr;
    return exprContainsSubquery(be.left) || exprContainsSubquery(be.right);
  }
  if (t === 'expr_list') {
    const list = (expr as { value?: NSPExpr[] }).value ?? [];
    return list.some(exprContainsSubquery);
  }
  return false;
}

function buildSubqueryFromClauses(from: NSPTable[]): ClauseNode[] {
  const results: ClauseNode[] = [];
  for (const f of from) {
    if (f.join) continue; // joins are handled separately
    if (!f.expr) continue;
    const innerStmt = f.expr.ast ?? f.expr.statement;
    const alias = f.as ?? 'subquery_df';
    const rawText = `(subquery) AS ${alias}`;
    const innerClauses = innerStmt ? buildClauses(innerStmt) : [];
    results.push({
      type: 'SUBQUERY_FROM',
      rawText,
      tokens: tokeniseText(rawText),
      children: innerClauses,
    });
  }
  return results;
}

function buildSubqueryWhereHavingClause(expr: NSPExpr): ClauseNode {
  const text = exprToText(expr);
  return {
    type: 'SUBQUERY_WHERE_HAVING',
    rawText: `WHERE/HAVING ${text}`,
    tokens: tokeniseText(text),
  };
}

// ---------------------------------------------------------------------------
// Main clause-building function for a single SELECT statement
// ---------------------------------------------------------------------------

function buildClauses(stmt: NSPSelectStmt): ClauseNode[] {
  const clauses: ClauseNode[] = [];

  const from = stmt.from ?? [];
  const hasJoins = from.some((f) => !!f.join);
  const hasFromSubquery = fromContainsSubquery(from);

  // JOINs — extracted before SELECT so they appear in logical order
  if (hasJoins) {
    clauses.push(...buildJoinClauses(from));
  }

  // FROM subqueries
  if (hasFromSubquery) {
    clauses.push(...buildSubqueryFromClauses(from));
  }

  // DISTINCT (mutually exclusive presentation with plain SELECT)
  const isDistinct =
    stmt.distinct === 'DISTINCT' ||
    stmt.distinct === 'distinct' ||
    (typeof stmt.distinct === 'string' && stmt.distinct.toLowerCase() === 'distinct');

  if (isDistinct) {
    clauses.push(buildDistinctClause(stmt));
  } else {
    clauses.push(buildSelectClause(stmt));
  }

  // WHERE
  if (stmt.where) {
    const whereHasSubquery = exprContainsSubquery(stmt.where);
    if (whereHasSubquery) {
      clauses.push(buildSubqueryWhereHavingClause(stmt.where));
    } else {
      clauses.push(buildWhereClause(stmt.where));
    }
  }

  // GROUP BY
  if (stmt.groupby && stmt.groupby.length > 0) {
    clauses.push(buildGroupByClause(stmt.groupby));
  }

  // HAVING
  if (stmt.having) {
    const havingHasSubquery = exprContainsSubquery(stmt.having);
    if (havingHasSubquery) {
      clauses.push(buildSubqueryWhereHavingClause(stmt.having));
    } else {
      clauses.push(buildHavingClause(stmt.having));
    }
  }

  // ORDER BY
  if (stmt.orderby && stmt.orderby.length > 0) {
    clauses.push(buildOrderByClause(stmt.orderby));
  }

  // LIMIT
  if (stmt.limit) {
    clauses.push(buildLimitClause(stmt.limit));
  }

  return clauses;
}

// ---------------------------------------------------------------------------
// Unsupported construct detection
// ---------------------------------------------------------------------------

function detectUnsupported(stmt: NSPSelectStmt): string[] {
  const found: string[] = [];

  // CTE (WITH clause)
  if (stmt.with && Array.isArray(stmt.with) && stmt.with.length > 0) {
    found.push('CTE (WITH)');
  }

  // UNION / INTERSECT / EXCEPT
  if (stmt._next || stmt.set_op) {
    const op = stmt.set_op?.toUpperCase() ?? 'UNION';
    found.push(op);
  }

  // Window functions in SELECT columns
  if (stmt.columns !== '*' && columnsContainWindowFunction(stmt.columns)) {
    found.push('WINDOW FUNCTION (OVER)');
  }

  return found;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const parser = new Parser();

/**
 * Parse a SQL string and produce a `SqlAST`.
 *
 * @param sql - The raw SQL query string.
 * @returns A `SqlAST` with recognised `clauses` and any `unsupported` constructs.
 * @throws `ParseError` if the input cannot be parsed as valid SQL.
 */
export function parseSQL(sql: string): SqlAST {
  let rawAST: unknown;

  try {
    rawAST = parser.astify(sql, { database: 'MySQL' });
  } catch (err: unknown) {
    // node-sql-parser throws an Error with a message like:
    // "Unexpected token X at line N, col M"
    const errMsg: string =
      err instanceof Error ? err.message : String(err);

    // Try to extract line number and token from the message
    const lineMatch = errMsg.match(/line[:\s]+(\d+)/i);
    const tokenMatch = errMsg.match(
      /(?:token|near|unexpected)[:\s]+"?([^\s,"]+)"?/i,
    );

    const lineNumber = lineMatch ? parseInt(lineMatch[1], 10) : undefined;
    const token = tokenMatch ? tokenMatch[1] : undefined;

    throw new ParseError(
      `SQL syntax error: ${errMsg}`,
      lineNumber,
      token,
    );
  }

  // astify can return a single statement or an array; normalise to array
  const stmtArray: unknown[] = Array.isArray(rawAST) ? rawAST : [rawAST];

  if (stmtArray.length === 0) {
    throw new ParseError('No SQL statement could be parsed.', undefined, undefined);
  }

  // Only the first SELECT statement is processed; multi-statement scripts are
  // partially unsupported.
  const stmt = stmtArray[0] as NSPSelectStmt;

  if (!stmt || typeof stmt !== 'object') {
    throw new ParseError('Unexpected parser output.', undefined, undefined);
  }

  // Non-SELECT statements (INSERT, UPDATE, DELETE, …) are unsupported
  if (stmt.type !== 'select') {
    const stmtType = (stmt as { type?: string }).type?.toUpperCase() ?? 'UNKNOWN';
    const ast: SqlAST = {
      raw: sql,
      clauses: [],
      unsupported: [stmtType],
    };
    return ast;
  }

  const clauses = buildClauses(stmt);
  const unsupported = detectUnsupported(stmt);

  // If there were multiple statements, flag that
  if (stmtArray.length > 1) {
    unsupported.push('MULTIPLE STATEMENTS');
  }

  return {
    raw: sql,
    clauses,
    unsupported,
  };
}
