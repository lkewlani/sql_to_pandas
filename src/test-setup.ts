// Vitest global setup file
// Runs before each test file in the suite.

// Polyfill navigator.clipboard for jsdom (not available by default)
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
})
