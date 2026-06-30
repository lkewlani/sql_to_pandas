/**
 * Core type definitions for the SQL-to-Pandas Translator.
 * These types represent the data models used across the parsing,
 * translation, and explanation pipeline.
 */

// ---------------------------------------------------------------------------
// ClauseType
// ---------------------------------------------------------------------------

/**
 * Union type of all SQL clause types recognised by the translator.
 * "JOIN" covers INNER, LEFT, RIGHT, and FULL OUTER joins.
 * "SUBQUERY_FROM" covers subqueries in the FROM position.
 * "SUBQUERY_WHERE_HAVING" covers subqueries nested inside WHERE or HAVING.
 */
export type ClauseType =
  | "SELECT"
  | "WHERE"
  | "GROUP_BY"
  | "HAVING"
  | "ORDER_BY"
  | "LIMIT"
  | "JOIN"
  | "DISTINCT"
  | "SUBQUERY_FROM"
  | "SUBQUERY_WHERE_HAVING";

// ---------------------------------------------------------------------------
// AST nodes
// ---------------------------------------------------------------------------

/**
 * A single node in the clause-level Abstract Syntax Tree produced by the
 * SQL Parser. Each node corresponds to one recognised SQL clause.
 */
export interface ClauseNode {
  /** Which clause this node represents. */
  type: ClauseType;
  /** The original SQL fragment for this clause, as it appeared in the input. */
  rawText: string;
  /** Tokenised content of this clause. */
  tokens: string[];
  /** Child nodes for nested subqueries. */
  children?: ClauseNode[];
}

/**
 * The complete Abstract Syntax Tree produced by the SQL Parser for one query.
 *
 * Validation rules:
 * - `raw` must be a non-empty string with at least one non-whitespace character.
 * - `raw` length must not exceed 10,000 characters.
 * - `clauses` must contain at least one ClauseNode for a successful parse.
 * - Each `ClauseNode.rawText` must be a non-empty substring of `raw`.
 */
export interface SqlAST {
  /** The original, unmodified SQL query string. */
  raw: string;
  /** Ordered list of recognised clause nodes extracted from the query. */
  clauses: ClauseNode[];
  /** Names of constructs present in the query but not supported by the translator. */
  unsupported: string[];
}

// ---------------------------------------------------------------------------
// Translation output
// ---------------------------------------------------------------------------

/**
 * The pandas translation output for a single SQL clause.
 */
export interface ClauseOutput {
  /** The SQL clause type this output was produced for. */
  clauseType: ClauseType;
  /** The generated pandas code fragment for this clause. */
  pandasCode: string;
  /** Human-readable explanation of how this SQL concept maps to pandas. */
  explanation: string;
}

/**
 * The full result returned by the translation pipeline for one SQL query.
 *
 * Additional constraints:
 * - `fullPandasCode` is the ordered concatenation of all `ClauseOutput.pandasCode`
 *   segments separated by newlines, following pandas execution order:
 *   DataFrame assignment → filter → groupby → having → select → sort → head.
 * - When `hasPartialOutput` is `true`, untranslatable sections are replaced with
 *   an inline comment: `# [UNSUPPORTED: <ClauseName>]`.
 */
export interface TranslationResult {
  /** Whether the translation completed without any blocking errors. */
  success: boolean;
  /** Ordered list of translated clause outputs. */
  clauses: ClauseOutput[];
  /** The complete, assembled pandas script ready to copy and run. */
  fullPandasCode: string;
  /** List of errors encountered during validation, parsing, or translation. Empty on full success. */
  errors: TranslationError[];
  /** True when at least one clause translated successfully and at least one did not. */
  hasPartialOutput: boolean;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/**
 * A structured error produced by the validation, parsing, or translation pipeline.
 */
export interface TranslationError {
  /** Category of the error. */
  type: "PARSE_ERROR" | "UNSUPPORTED_CLAUSE" | "VALIDATION_ERROR";
  /** Human-readable description of what went wrong. */
  message: string;
  /** The name of the unsupported clause. Present only for UNSUPPORTED_CLAUSE errors. */
  clauseName?: string;
  /** Source line number where the parse error occurred. Present only for PARSE_ERROR. */
  lineNumber?: number;
  /** The offending token that caused the parse error. Present only for PARSE_ERROR. */
  token?: string;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * The result returned by the input validator.
 */
export interface ValidationResult {
  /** Whether the input passed all validation checks. */
  valid: boolean;
  /** Human-readable error message when `valid` is false. */
  error?: string;
}

// ---------------------------------------------------------------------------
// Example queries
// ---------------------------------------------------------------------------

/**
 * A pre-built example SQL query shown in the Example Query Panel.
 */
export interface ExampleQuery {
  /** Unique slug identifier, e.g. "basic-select". */
  id: string;
  /** Display label shown on the button. Maximum 60 characters. */
  label: string;
  /** The pre-built SQL text loaded into the input area when selected. */
  sql: string;
}

// ---------------------------------------------------------------------------
// ParseError class
// ---------------------------------------------------------------------------

/**
 * Structured error thrown by the SQL Parser when it cannot tokenise the input.
 * Extends the native Error class so it integrates with standard try/catch flows.
 */
export class ParseError extends Error {
  /** Source line number where the error was detected. */
  lineNumber?: number;
  /** The offending token that triggered the error. */
  token?: string;

  constructor(message: string, lineNumber?: number, token?: string) {
    super(message);
    this.name = "ParseError";
    this.lineNumber = lineNumber;
    this.token = token;

    // Restore the prototype chain in environments that transpile classes
    // (e.g. TypeScript targeting ES5).
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
