/**
 * Unit tests for the Input Validator.
 * Requirements: 1.3, 1.6
 */

import { describe, it, expect } from "vitest";
import { validateInput } from "../inputValidator";

const EMPTY_ERROR_MESSAGE = "Please enter a SQL query before translating.";
const CHAR_LIMIT = 10_000;

describe("validateInput", () => {
  // -------------------------------------------------------------------------
  // Empty / whitespace-only input (Requirement 1.3)
  // -------------------------------------------------------------------------

  it("returns { valid: false } with the prompt message for an empty string", () => {
    const result = validateInput("");
    expect(result.valid).toBe(false);
    expect(result.error).toBe(EMPTY_ERROR_MESSAGE);
  });

  it("returns { valid: false } for a whitespace-only string with spaces", () => {
    const result = validateInput("   ");
    expect(result.valid).toBe(false);
    expect(result.error).toBe(EMPTY_ERROR_MESSAGE);
  });

  it("returns { valid: false } for a whitespace-only string with newlines", () => {
    const result = validateInput("\n");
    expect(result.valid).toBe(false);
    expect(result.error).toBe(EMPTY_ERROR_MESSAGE);
  });

  it("returns { valid: false } for a whitespace-only string with tabs", () => {
    const result = validateInput("\t");
    expect(result.valid).toBe(false);
    expect(result.error).toBe(EMPTY_ERROR_MESSAGE);
  });

  it("returns { valid: false } for a mixed whitespace-only string", () => {
    const result = validateInput("  \n\t  \n");
    expect(result.valid).toBe(false);
    expect(result.error).toBe(EMPTY_ERROR_MESSAGE);
  });

  // -------------------------------------------------------------------------
  // Character limit boundary (Requirement 1.6)
  // -------------------------------------------------------------------------

  it("returns { valid: true } for a string of exactly 10,000 characters", () => {
    const input = "a".repeat(CHAR_LIMIT);
    expect(input.length).toBe(CHAR_LIMIT);
    const result = validateInput(input);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("returns { valid: false } for a string of 10,001 characters", () => {
    const input = "a".repeat(CHAR_LIMIT + 1);
    expect(input.length).toBe(CHAR_LIMIT + 1);
    const result = validateInput(input);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("10,000 character limit");
    expect(result.error).toContain(String(CHAR_LIMIT + 1));
  });

  it("error message for over-limit input includes the actual character count", () => {
    const actualLength = CHAR_LIMIT + 500;
    const input = "x".repeat(actualLength);
    const result = validateInput(input);
    expect(result.valid).toBe(false);
    expect(result.error).toContain(String(actualLength));
  });

  // -------------------------------------------------------------------------
  // Valid SQL input
  // -------------------------------------------------------------------------

  it("returns { valid: true } for a standard SELECT query", () => {
    const result = validateInput("SELECT name, age FROM employees WHERE age > 30;");
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("returns { valid: true } for a short non-empty string", () => {
    const result = validateInput("SELECT 1");
    expect(result.valid).toBe(true);
  });

  it("returns { valid: true } for a multi-line SQL query", () => {
    const sql = `SELECT department, COUNT(*) AS headcount
FROM employees
WHERE salary > 50000
GROUP BY department
ORDER BY headcount DESC
LIMIT 5;`;
    const result = validateInput(sql);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});
