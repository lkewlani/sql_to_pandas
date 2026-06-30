/**
 * Unit tests for the Error Handler.
 * Requirements: 4.1, 4.2
 */

import { describe, it, expect } from "vitest";
import { buildErrorList } from "../errorHandler";
import { ParseError } from "../types";

describe("buildErrorList", () => {
  // -------------------------------------------------------------------------
  // Empty / no-error case
  // -------------------------------------------------------------------------

  it("returns an empty array when called with no arguments", () => {
    const result = buildErrorList();
    expect(result).toEqual([]);
  });

  it("returns an empty array when all arguments are undefined", () => {
    const result = buildErrorList(undefined, undefined, undefined);
    expect(result).toEqual([]);
  });

  it("returns an empty array when unsupportedClauses is an empty array", () => {
    const result = buildErrorList(undefined, []);
    expect(result).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // Parse error (Requirement 4.1)
  // -------------------------------------------------------------------------

  it("includes a PARSE_ERROR entry when a ParseError is provided", () => {
    const parseError = new ParseError("Unexpected token", 3, "SELECTT");
    const result = buildErrorList(parseError);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("PARSE_ERROR");
  });

  it("parse error entry includes the line number from the ParseError", () => {
    const parseError = new ParseError("Unexpected token", 5, "FROMM");
    const result = buildErrorList(parseError);

    expect(result[0].lineNumber).toBe(5);
  });

  it("parse error entry includes the offending token from the ParseError", () => {
    const parseError = new ParseError("Unexpected token", 2, "WHREE");
    const result = buildErrorList(parseError);

    expect(result[0].token).toBe("WHREE");
  });

  it("parse error message references the line number", () => {
    const parseError = new ParseError("Unexpected keyword", 7, "GRUP");
    const result = buildErrorList(parseError);

    expect(result[0].message).toContain("7");
  });

  it("parse error message references the offending token", () => {
    const parseError = new ParseError("Unexpected keyword", 1, "SELEKT");
    const result = buildErrorList(parseError);

    expect(result[0].message).toContain("SELEKT");
  });

  it("parse error entry works when lineNumber is undefined", () => {
    const parseError = new ParseError("Unknown parse failure");
    const result = buildErrorList(parseError);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("PARSE_ERROR");
    expect(result[0].lineNumber).toBeUndefined();
    expect(result[0].message).toBeTruthy();
  });

  it("parse error entry works when token is undefined", () => {
    const parseError = new ParseError("Parse failed at unknown location", 4);
    const result = buildErrorList(parseError);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("PARSE_ERROR");
    expect(result[0].token).toBeUndefined();
    expect(result[0].message).toBeTruthy();
  });

  // -------------------------------------------------------------------------
  // Unsupported clauses (Requirement 4.2)
  // -------------------------------------------------------------------------

  it("includes an UNSUPPORTED_CLAUSE entry for a single unsupported clause", () => {
    const result = buildErrorList(undefined, ["WITH"]);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("UNSUPPORTED_CLAUSE");
  });

  it("unsupported clause entry carries the clause name", () => {
    const result = buildErrorList(undefined, ["UNION"]);

    expect(result[0].clauseName).toBe("UNION");
  });

  it("unsupported clause message mentions the clause name", () => {
    const result = buildErrorList(undefined, ["WINDOW"]);

    expect(result[0].message).toContain("WINDOW");
  });

  it("produces one UNSUPPORTED_CLAUSE entry per clause in the list", () => {
    const result = buildErrorList(undefined, ["WITH", "UNION", "WINDOW"]);

    const unsupportedEntries = result.filter((e) => e.type === "UNSUPPORTED_CLAUSE");
    expect(unsupportedEntries).toHaveLength(3);
  });

  it("each entry in a multi-clause list carries its own clause name", () => {
    const clauses = ["WITH", "UNION", "INTERSECT"];
    const result = buildErrorList(undefined, clauses);

    const names = result.map((e) => e.clauseName);
    expect(names).toContain("WITH");
    expect(names).toContain("UNION");
    expect(names).toContain("INTERSECT");
  });

  // -------------------------------------------------------------------------
  // Both parse error and unsupported clauses present
  // -------------------------------------------------------------------------

  it("includes both PARSE_ERROR and UNSUPPORTED_CLAUSE entries when both are provided", () => {
    const parseError = new ParseError("Syntax error", 2, "SELEKT");
    const result = buildErrorList(parseError, ["WITH"]);

    const types = result.map((e) => e.type);
    expect(types).toContain("PARSE_ERROR");
    expect(types).toContain("UNSUPPORTED_CLAUSE");
  });

  // -------------------------------------------------------------------------
  // Validation error ordering
  // -------------------------------------------------------------------------

  it("includes a VALIDATION_ERROR entry when a validation error message is provided", () => {
    const result = buildErrorList(undefined, undefined, "Please enter a SQL query.");

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("VALIDATION_ERROR");
    expect(result[0].message).toBe("Please enter a SQL query.");
  });

  it("VALIDATION_ERROR appears before PARSE_ERROR in the output", () => {
    const parseError = new ParseError("Syntax error", 1, "BAD");
    const result = buildErrorList(parseError, undefined, "Query is required.");

    expect(result[0].type).toBe("VALIDATION_ERROR");
    expect(result[1].type).toBe("PARSE_ERROR");
  });

  it("PARSE_ERROR appears before UNSUPPORTED_CLAUSE entries in the output", () => {
    const parseError = new ParseError("Syntax error", 1, "BAD");
    const result = buildErrorList(parseError, ["WITH"]);

    expect(result[0].type).toBe("PARSE_ERROR");
    expect(result[1].type).toBe("UNSUPPORTED_CLAUSE");
  });
});
