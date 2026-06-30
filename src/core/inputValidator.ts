import type { ValidationResult } from "./types";

/** Maximum allowed character count for a SQL query. */
const MAX_QUERY_LENGTH = 10_000;

/**
 * Validates a raw SQL input string before it is passed to the parser.
 *
 * Rules:
 * - Empty or whitespace-only input → error with a prompt to enter a query.
 * - Input longer than MAX_QUERY_LENGTH characters → error including the actual count.
 * - All other input → `{ valid: true }`.
 *
 * Requirements: 1.3, 1.6
 */
export function validateInput(text: string): ValidationResult {
  if (text.trim().length === 0) {
    return {
      valid: false,
      error: "Please enter a SQL query before translating.",
    };
  }

  if (text.length > MAX_QUERY_LENGTH) {
    return {
      valid: false,
      error: `Query exceeds the 10,000 character limit (${text.length} / 10,000 characters).`,
    };
  }

  return { valid: true };
}
