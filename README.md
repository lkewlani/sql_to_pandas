# SQL to Pandas Translator

A single-page, fully client-side web app that converts SQL queries into equivalent pandas Python code with per-clause explanations. Built with Vite + React + TypeScript.

## Prerequisites

- [Node.js](https://nodejs.org/) v20 or later
- npm v10 or later

## Getting Started

```bash
# Install dependencies (all versions pinned in package.json)
npm install

# Start the development server
npm run dev

# Open http://localhost:5173 in your browser
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server at http://localhost:5173 |
| `npm run build` | Type-check and build static files to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run unit and property-based tests with Vitest |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:e2e` | Run Playwright end-to-end tests |
| `npm run lint` | Type-check without emitting files |

## Project Structure

```
src/
├── components/       # React UI components
│   ├── SqlInputPanel.tsx
│   ├── ExampleQueryPanel.tsx
│   ├── OutputPanel.tsx
│   ├── CopyButton.tsx
│   └── ErrorSection.tsx
├── core/             # Pure translation logic (no React)
│   ├── types.ts          # Shared TypeScript interfaces and enums
│   ├── inputValidator.ts
│   ├── sqlParser.ts
│   ├── clauseTranslator.ts
│   ├── explanationGenerator.ts
│   ├── errorHandler.ts
│   └── translator.ts     # Orchestrates the full pipeline
├── data/
│   └── examples.ts       # Pre-built example SQL queries
├── styles/
│   ├── globals.css
│   └── layout.css
├── tests/
│   └── e2e/              # Playwright tests
├── App.tsx
├── main.tsx
└── test-setup.ts         # Vitest global setup
```

## Architecture

All SQL parsing and translation runs entirely in the browser — no backend required. The app is deployable as a static site (Requirement 7.1).

See [`.kiro/specs/sql-to-pandas-translator/design.md`](.kiro/specs/sql-to-pandas-translator/design.md) for the full design.
