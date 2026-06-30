/**
 * Error Handler module for the SQL-to-Pandas Translator.
 * Collects validation errors, parse errors, and unsupported-clause notices
 * into a structured TranslationError list for display.
 */

import { TranslationError, ParseError } from "./types";

/**
 * Builds a list of structured TranslationErrors from the various error sources
 * in the translation pipeline.
 *
 * @param parseError       - A ParseError thrown by the SQL parser, if any.
 * @param unsupportedClauses - Names of SQL constructs the translator does not handle.
 * @param validationError  - A validation error message from the input validator, if any.
 * @returns An ordered array of TranslationError objects (may be empty).
 *
 * Order: VALIDATION_ERROR first, then PARSE_ERROR, then UNSUPPORTED_CLAUSE entries.
 *
 * Requirements: 4.1–4.4
 */
export function buildErrorList(
  parseError?: ParseError,
  unsupportedClauses?: string[],
  validationError?: string
): TranslationError[] {
  const errors: TranslationError[] = [];

  // 1. Validation errors come first — they prevent parsing from even starting.
  if (validationError) {
    errors.push({
      type: "VALIDATION_ERROR",
      message: validationError,
    });
  }

  // 2. Parse errors — produced when the SQL parser cannot tokenise the input.
  if (parseError) {
    const lineInfo =
      parseError.lineNumber !== undefined
        ? `line ${parseError.lineNumber}`
        : "unknown line";
    const tokenInfo =
      parseError.token !== undefined ? `'${parseError.token}'` : "unknown token";

    errors.push({
      type: "PARSE_ERROR",
      message: `SQL syntax error on ${lineInfo} near ${tokenInfo}: ${parseError.message}`,
      lineNumber: parseError.lineNumber,
      token: parseError.token,
    });
  }

  // 3. Unsupported clause errors — one entry per unsupported construct.
  if (unsupportedClauses && unsupportedClauses.length > 0) {
    for (const clauseName of unsupportedClauses) {
      errors.push({
        type: "UNSUPPORTED_CLAUSE",
        message: `${clauseName} is not yet supported`,
        clauseName,
      });
    }
  }

  return errors;
}
