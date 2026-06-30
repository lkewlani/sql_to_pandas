/**
 * Explanation Generator — maps each recognised SQL clause type to a
 * pre-written, human-readable description of how that clause translates
 * to a pandas operation.
 */

import type { ClauseType } from "./types";

// ---------------------------------------------------------------------------
// Explanation map
// ---------------------------------------------------------------------------

/**
 * Static lookup table that maps every supported ClauseType to a plain-English
 * explanation of the equivalent pandas pattern.
 *
 * Requirements covered: 3.1 – 3.10
 */
const EXPLANATIONS: Record<ClauseType, string> = {
  SELECT:
    "In pandas, column selection uses bracket notation: df[['col1','col2']] for multiple columns, or df['col'] for a single column. df.loc[] can also be used for label-based selection.",
  WHERE:
    "pandas uses boolean masks for row filtering. Conditions are written as df[df['col'] == value]. Multiple conditions are combined with & (AND) and | (OR), each condition wrapped in parentheses.",
  GROUP_BY:
    "df.groupby('col') splits the DataFrame into groups. It is almost always followed by an aggregation like .agg(), .sum(), or .count(), and .reset_index() to flatten the result back into a DataFrame.",
  HAVING:
    "HAVING filters groups after aggregation. In pandas, apply a boolean mask to the grouped result: grouped_df[grouped_df['count'] > 5]. This is equivalent to SQL's HAVING clause.",
  ORDER_BY:
    "sort_values() sorts a DataFrame. Pass ascending=False for DESC order. For multiple columns, pass lists: df.sort_values(['col1','col2'], ascending=[True, False]).",
  LIMIT:
    "head(n) returns the first n rows of a DataFrame, equivalent to SQL's LIMIT n.",
  JOIN:
    "pd.merge() joins DataFrames. The how parameter controls join type: 'inner', 'left', 'right', or 'outer'. left_on and right_on specify the key columns from each DataFrame.",
  DISTINCT:
    "drop_duplicates() removes duplicate rows. Apply it after column selection to get distinct combinations: df[['col1','col2']].drop_duplicates().",
  SUBQUERY_FROM:
    "A FROM subquery becomes an intermediate DataFrame in pandas. Assign the inner query result to a variable first, then use that variable in the outer query.",
  SUBQUERY_WHERE_HAVING:
    "A WHERE subquery is expressed as a nested pandas expression. Use .isin() for IN subqueries, or a direct comparison for scalar subqueries.",
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the human-readable explanation string for the given SQL clause type.
 *
 * @param clauseType - One of the supported ClauseType values.
 * @returns A non-empty string describing the pandas equivalent of that clause.
 */
export function getExplanation(clauseType: ClauseType): string {
  return EXPLANATIONS[clauseType];
}
