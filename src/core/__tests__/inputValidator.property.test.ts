import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { validateInput } from '../inputValidator';

/**
 * Property-Based Tests for Input Validator
 * Validates: Requirements 1.6
 */
describe('InputValidator — Property 5: Character limit', () => {
  it('always blocks strings longer than 10,000 characters before reaching the parser', () => {
    fc.assert(
      fc.property(
        // Generate strings that strictly exceed the 10,000-character limit
        fc.string({ minLength: 10001 }),
        (input) => {
          const result = validateInput(input);

          // The validator must always return { valid: false }
          if (result.valid !== false) return false;

          // The error message must mention the character limit
          if (!result.error) return false;
          const mentionsLimit =
            result.error.includes('10,000') ||
            result.error.includes('10000');

          return mentionsLimit;
        }
      ),
      { numRuns: 100 }
    );
  });
});
