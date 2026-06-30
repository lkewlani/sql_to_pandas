import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { getExplanation } from '../explanationGenerator';
import type { ClauseType } from '../types';

/**
 * Property-Based Tests for Explanation Generator
 * Validates: Requirements 3.1, 3.3
 */

const allClauseTypes: ClauseType[] = [
  "SELECT",
  "WHERE",
  "GROUP_BY",
  "HAVING",
  "ORDER_BY",
  "LIMIT",
  "JOIN",
  "DISTINCT",
  "SUBQUERY_FROM",
  "SUBQUERY_WHERE_HAVING",
];

describe('ExplanationGenerator — Property 3: Explanation coverage', () => {
  it('always returns a non-empty explanation string for every ClauseType value', () => {
    fc.assert(
      fc.property(
        // Sample from the full list of ClauseType values
        fc.constantFrom(...allClauseTypes),
        (clauseType) => {
          const explanation = getExplanation(clauseType);

          // Must return a string
          if (typeof explanation !== 'string') return false;

          // Must be non-empty (at least one non-whitespace character)
          if (explanation.trim().length === 0) return false;

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
