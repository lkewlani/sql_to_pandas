import type { ExampleQuery } from '../core/types'

const EXAMPLE_QUERIES: ExampleQuery[] = [
  { id: 'basic-select', label: 'Select id and name', sql: 'SELECT id, name FROM users' },
  { id: 'where-filter', label: 'Filter rows with WHERE', sql: "SELECT * FROM orders WHERE amount > 100" },
  { id: 'groupby-agg', label: 'Group by and aggregate', sql: 'SELECT category, SUM(amount) FROM sales GROUP BY category' },
]

export default EXAMPLE_QUERIES
