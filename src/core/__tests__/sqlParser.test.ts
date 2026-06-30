/**
 * Unit tests for SQL Parser (src/core/sqlParser.ts)
 *
 * Requirements: 2.3–2.13, 4.1
 *
 * Tests verify that parseSQL() produces the correct SqlAST for each supported
 * SQL clause type, throws ParseError for invalid input, and populates
 * unsupported[] for constructs such as CTEs and UNION.
 */

import { describe, it, expect } from 'vitest';
import { parseSQL } from '../sqlParser';
import { ParseError } from '../types';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/** Returns the clause types present in an AST in order. */
function clauseTypes(sql: string) {
  const ast = parseSQL(sql);
  return ast.clauses.map((c) => c.type);
}

// ---------------------------------------------------------------------------
// 1. Valid SELECT → AST has correct SELECT ClauseNode  (Req 2.3)
// ---------------------------------------------------------------------------
describe('SELECT clause', () => {
  it('produces a SELECT ClauseNode for a simple column list', () => {
    const ast = parseSQL('SELECT name, age FROM employees');

    const select = ast.clauses.find((c) => c.type === 'SELECT');
    expect(select).toBeDefined();
    expect(select!.type).toBe('SELECT');
    expect(select!.rawText).toMatch(/SELECT/i);
    expect(select!.rawText).toMatch(/name/i);
    expect(select!.rawText).toMatch(/age/i);
    expect(ast.unsupported).toHaveLength(0);
  });

  it('produces a SELECT ClauseNode for SELECT *', () => {
    const ast = parseSQL('SELECT * FROM employees');

    const select = ast.clauses.find((c) => c.type === 'SELECT');
    expect(select).toBeDefined();
    expect(select!.rawText).toContain('*');
  });

  it('stores raw SQL on the AST', () => {
    const sql = 'SELECT id FROM employees';
    const ast = parseSQL(sql);
    expect(ast.raw).toBe(sql);
  });

  it('produces at least one ClauseNode for a successful parse', () => {
    const ast = parseSQL('SELECT id FROM t');
    expect(ast.clauses.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// 2. SELECT with WHERE → AST has SELECT + WHERE ClauseNodes  (Req 2.4)
// ---------------------------------------------------------------------------
describe('WHERE clause', () => {
  it('produces both SELECT and WHERE nodes', () => {
    const types = clauseTypes(
      "SELECT name FROM employees WHERE salary > 50000",
    );
    expect(types).toContain('SELECT');
    expect(types).toContain('WHERE');
  });

  it('WHERE ClauseNode rawText contains the condition text', () => {
    const ast = parseSQL(
      "SELECT name FROM employees WHERE department = 'Engineering'",
    );
    const where = ast.clauses.find((c) => c.type === 'WHERE');
    expect(where).toBeDefined();
    expect(where!.rawText).toMatch(/WHERE/i);
    expect(where!.rawText).toMatch(/department/i);
  });
});

// ---------------------------------------------------------------------------
// 3. SELECT with GROUP BY → AST has SELECT + GROUP_BY ClauseNodes  (Req 2.6)
// ---------------------------------------------------------------------------
describe('GROUP BY clause', () => {
  it('produces SELECT and GROUP_BY nodes', () => {
    const types = clauseTypes(
      'SELECT department, COUNT(*) FROM employees GROUP BY department',
    );
    expect(types).toContain('SELECT');
    expect(types).toContain('GROUP_BY');
  });

  it('GROUP_BY ClauseNode rawText references the group column', () => {
    const ast = parseSQL(
      'SELECT department, COUNT(*) FROM employees GROUP BY department',
    );
    const gb = ast.clauses.find((c) => c.type === 'GROUP_BY');
    expect(gb).toBeDefined();
    expect(gb!.rawText).toMatch(/GROUP BY/i);
    expect(gb!.rawText).toMatch(/department/i);
  });
});

// ---------------------------------------------------------------------------
// 4. SELECT with ORDER BY → AST has SELECT + ORDER_BY ClauseNodes  (Req 2.9)
// ---------------------------------------------------------------------------
describe('ORDER BY clause', () => {
  it('produces SELECT and ORDER_BY nodes', () => {
    const types = clauseTypes(
      'SELECT name, salary FROM employees ORDER BY salary DESC',
    );
    expect(types).toContain('SELECT');
    expect(types).toContain('ORDER_BY');
  });

  it('ORDER_BY ClauseNode rawText contains the sort column and direction', () => {
    const ast = parseSQL(
      'SELECT name FROM employees ORDER BY salary DESC',
    );
    const ob = ast.clauses.find((c) => c.type === 'ORDER_BY');
    expect(ob).toBeDefined();
    expect(ob!.rawText).toMatch(/ORDER BY/i);
    expect(ob!.rawText).toMatch(/salary/i);
    expect(ob!.rawText).toMatch(/DESC/i);
  });
});

// ---------------------------------------------------------------------------
// 5. SELECT with LIMIT → AST has SELECT + LIMIT ClauseNodes  (Req 2.10)
// ---------------------------------------------------------------------------
describe('LIMIT clause', () => {
  it('produces SELECT and LIMIT nodes', () => {
    const types = clauseTypes(
      'SELECT name FROM employees ORDER BY salary DESC LIMIT 10',
    );
    expect(types).toContain('SELECT');
    expect(types).toContain('LIMIT');
  });

  it('LIMIT ClauseNode rawText contains the limit value', () => {
    const ast = parseSQL('SELECT name FROM employees LIMIT 5');
    const limit = ast.clauses.find((c) => c.type === 'LIMIT');
    expect(limit).toBeDefined();
    expect(limit!.rawText).toMatch(/LIMIT/i);
    expect(limit!.rawText).toMatch(/5/);
  });
});

// ---------------------------------------------------------------------------
// 6. SELECT with INNER JOIN → AST has JOIN ClauseNode  (Req 2.11)
// ---------------------------------------------------------------------------
describe('JOIN clause', () => {
  it('produces a JOIN ClauseNode for INNER JOIN', () => {
    const ast = parseSQL(
      'SELECT e.name, d.department_name FROM employees e INNER JOIN departments d ON e.department_id = d.id',
    );
    const join = ast.clauses.find((c) => c.type === 'JOIN');
    expect(join).toBeDefined();
    expect(join!.type).toBe('JOIN');
  });

  it('JOIN ClauseNode rawText contains the join type and table name', () => {
    const ast = parseSQL(
      'SELECT e.name FROM employees e INNER JOIN departments d ON e.department_id = d.id',
    );
    const join = ast.clauses.find((c) => c.type === 'JOIN');
    expect(join!.rawText).toMatch(/INNER JOIN/i);
    expect(join!.rawText).toMatch(/departments/i);
  });

  it('produces a JOIN ClauseNode for LEFT JOIN', () => {
    const ast = parseSQL(
      'SELECT e.name FROM employees e LEFT JOIN departments d ON e.department_id = d.id',
    );
    const join = ast.clauses.find((c) => c.type === 'JOIN');
    expect(join).toBeDefined();
    expect(join!.rawText).toMatch(/LEFT JOIN/i);
  });

  it('produces a JOIN ClauseNode for RIGHT JOIN', () => {
    const ast = parseSQL(
      'SELECT e.name FROM employees e RIGHT JOIN departments d ON e.department_id = d.id',
    );
    const join = ast.clauses.find((c) => c.type === 'JOIN');
    expect(join).toBeDefined();
    expect(join!.rawText).toMatch(/RIGHT JOIN/i);
  });
});

// ---------------------------------------------------------------------------
// 7. SELECT DISTINCT → AST has DISTINCT ClauseNode (not SELECT)  (Req 2.12)
// ---------------------------------------------------------------------------
describe('DISTINCT clause', () => {
  it('produces a DISTINCT ClauseNode (not a plain SELECT) for SELECT DISTINCT', () => {
    const ast = parseSQL('SELECT DISTINCT department FROM employees');
    const types = ast.clauses.map((c) => c.type);

    expect(types).toContain('DISTINCT');
    expect(types).not.toContain('SELECT');
  });

  it('DISTINCT ClauseNode rawText includes DISTINCT keyword', () => {
    const ast = parseSQL('SELECT DISTINCT department FROM employees');
    const distinct = ast.clauses.find((c) => c.type === 'DISTINCT');
    expect(distinct!.rawText).toMatch(/DISTINCT/i);
    expect(distinct!.rawText).toMatch(/department/i);
  });
});

// ---------------------------------------------------------------------------
// 8. SELECT with HAVING → AST has HAVING ClauseNode  (Req 2.7)
// ---------------------------------------------------------------------------
describe('HAVING clause', () => {
  it('produces GROUP_BY and HAVING nodes', () => {
    const types = clauseTypes(
      'SELECT department, COUNT(*) AS headcount FROM employees GROUP BY department HAVING COUNT(*) > 5',
    );
    expect(types).toContain('GROUP_BY');
    expect(types).toContain('HAVING');
  });

  it('HAVING ClauseNode rawText contains the having condition', () => {
    const ast = parseSQL(
      'SELECT department, COUNT(*) FROM employees GROUP BY department HAVING COUNT(*) > 5',
    );
    const having = ast.clauses.find((c) => c.type === 'HAVING');
    expect(having).toBeDefined();
    expect(having!.rawText).toMatch(/HAVING/i);
  });
});

// ---------------------------------------------------------------------------
// 9. Invalid SQL → throws ParseError  (Req 4.1)
// ---------------------------------------------------------------------------
describe('ParseError on invalid SQL', () => {
  it('throws a ParseError for completely invalid input', () => {
    expect(() => parseSQL('NOT VALID SQL!!!')).toThrow(ParseError);
  });

  it('thrown ParseError has name "ParseError"', () => {
    try {
      parseSQL('NOT VALID SQL!!!');
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ParseError);
      expect((err as ParseError).name).toBe('ParseError');
    }
  });

  it('throws ParseError for empty string (no statement)', () => {
    // node-sql-parser may throw on empty or whitespace-only SQL
    expect(() => parseSQL('')).toThrow();
  });

  it('thrown error has a non-empty message', () => {
    try {
      parseSQL('THIS IS NOT SQL @@@###');
      expect.fail('Should have thrown');
    } catch (err) {
      expect((err as Error).message).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// 10. CTE (WITH clause) → AST.unsupported contains "CTE (WITH)"  (Req 2.13)
// ---------------------------------------------------------------------------
describe('CTE unsupported detection', () => {
  it('populates unsupported with "CTE (WITH)" for a WITH clause query', () => {
    const ast = parseSQL(
      'WITH cte AS (SELECT id FROM employees) SELECT * FROM cte',
    );
    expect(ast.unsupported).toContain('CTE (WITH)');
  });

  it('still returns clauses[] for a parseable CTE query', () => {
    const ast = parseSQL(
      'WITH cte AS (SELECT id FROM employees) SELECT * FROM cte',
    );
    // Some clause nodes should still be present
    expect(ast.clauses).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 11. UNION query → AST.unsupported contains "UNION"
// ---------------------------------------------------------------------------
describe('UNION unsupported detection', () => {
  it('populates unsupported with "UNION" for a UNION query', () => {
    const ast = parseSQL(
      'SELECT name FROM employees UNION SELECT name FROM contractors',
    );
    expect(ast.unsupported).toContain('UNION');
  });
});

// ---------------------------------------------------------------------------
// 12. Each supported clause type produces the correct ClauseNode.type
// ---------------------------------------------------------------------------
describe('ClauseNode.type correctness for all supported clauses', () => {
  it('SELECT clause type is "SELECT"', () => {
    const ast = parseSQL('SELECT id FROM t');
    expect(ast.clauses.find((c) => c.type === 'SELECT')?.type).toBe('SELECT');
  });

  it('WHERE clause type is "WHERE"', () => {
    const ast = parseSQL("SELECT id FROM t WHERE id = 1");
    expect(ast.clauses.find((c) => c.type === 'WHERE')?.type).toBe('WHERE');
  });

  it('GROUP_BY clause type is "GROUP_BY"', () => {
    const ast = parseSQL('SELECT dept, COUNT(*) FROM t GROUP BY dept');
    expect(ast.clauses.find((c) => c.type === 'GROUP_BY')?.type).toBe('GROUP_BY');
  });

  it('HAVING clause type is "HAVING"', () => {
    const ast = parseSQL(
      'SELECT dept, COUNT(*) FROM t GROUP BY dept HAVING COUNT(*) > 2',
    );
    expect(ast.clauses.find((c) => c.type === 'HAVING')?.type).toBe('HAVING');
  });

  it('ORDER_BY clause type is "ORDER_BY"', () => {
    const ast = parseSQL('SELECT id FROM t ORDER BY id ASC');
    expect(ast.clauses.find((c) => c.type === 'ORDER_BY')?.type).toBe('ORDER_BY');
  });

  it('LIMIT clause type is "LIMIT"', () => {
    const ast = parseSQL('SELECT id FROM t LIMIT 3');
    expect(ast.clauses.find((c) => c.type === 'LIMIT')?.type).toBe('LIMIT');
  });

  it('JOIN clause type is "JOIN"', () => {
    const ast = parseSQL(
      'SELECT a.id FROM a INNER JOIN b ON a.id = b.a_id',
    );
    expect(ast.clauses.find((c) => c.type === 'JOIN')?.type).toBe('JOIN');
  });

  it('DISTINCT clause type is "DISTINCT"', () => {
    const ast = parseSQL('SELECT DISTINCT dept FROM t');
    expect(ast.clauses.find((c) => c.type === 'DISTINCT')?.type).toBe('DISTINCT');
  });

  it('every ClauseNode has a non-empty rawText', () => {
    const ast = parseSQL(
      "SELECT name, salary FROM employees WHERE salary > 50000 GROUP BY name HAVING COUNT(*) > 1 ORDER BY salary DESC LIMIT 5",
    );
    for (const clause of ast.clauses) {
      expect(clause.rawText.trim().length).toBeGreaterThan(0);
    }
  });

  it('every ClauseNode has a tokens array', () => {
    const ast = parseSQL('SELECT name FROM employees WHERE age > 30');
    for (const clause of ast.clauses) {
      expect(Array.isArray(clause.tokens)).toBe(true);
    }
  });
});
