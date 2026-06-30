/**
 * Unit tests for the Explanation Generator.
 *
 * Each test verifies that getExplanation() returns a non-empty string for the
 * given ClauseType, and that the string references the correct pandas construct.
 *
 * Requirements: 3.4–3.10
 */

import { describe, it, expect } from "vitest";
import { getExplanation } from "../explanationGenerator";

describe("getExplanation", () => {
  it("SELECT — returns non-empty string referencing bracket notation or df.loc[]", () => {
    const result = getExplanation("SELECT");
    expect(result.length).toBeGreaterThan(0);
    // The explanation must reference df[[...]] bracket notation or df.loc[]
    expect(result).toMatch(/df\[|df\.loc\[/);
  });

  it("WHERE — returns non-empty string referencing boolean mask or df[df[...]]", () => {
    const result = getExplanation("WHERE");
    expect(result.length).toBeGreaterThan(0);
    // The explanation must reference boolean mask or df[df[...]] pattern
    expect(result).toMatch(/boolean mask|df\[df\[/);
  });

  it("GROUP_BY — returns non-empty string referencing groupby()", () => {
    const result = getExplanation("GROUP_BY");
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain("groupby(");
  });

  it("HAVING — returns non-empty string referencing post-aggregation filter", () => {
    const result = getExplanation("HAVING");
    expect(result.length).toBeGreaterThan(0);
    // The explanation must mention aggregation in the context of filtering
    expect(result).toMatch(/aggregat/i);
  });

  it("ORDER_BY — returns non-empty string referencing sort_values()", () => {
    const result = getExplanation("ORDER_BY");
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain("sort_values(");
  });

  it("LIMIT — returns non-empty string referencing head(n)", () => {
    const result = getExplanation("LIMIT");
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain("head(");
  });

  it("JOIN — returns non-empty string referencing pd.merge()", () => {
    const result = getExplanation("JOIN");
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain("pd.merge(");
  });

  it("DISTINCT — returns non-empty string referencing drop_duplicates()", () => {
    const result = getExplanation("DISTINCT");
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain("drop_duplicates(");
  });

  it("SUBQUERY_FROM — returns non-empty string referencing an intermediate DataFrame", () => {
    const result = getExplanation("SUBQUERY_FROM");
    expect(result.length).toBeGreaterThan(0);
    // The explanation must mention assigning/using an intermediate DataFrame variable
    expect(result).toMatch(/intermediate DataFrame|variable/i);
  });

  it("SUBQUERY_WHERE_HAVING — returns non-empty string referencing .isin() or nested expression", () => {
    const result = getExplanation("SUBQUERY_WHERE_HAVING");
    expect(result.length).toBeGreaterThan(0);
    expect(result).toMatch(/\.isin\(|nested/i);
  });
});
