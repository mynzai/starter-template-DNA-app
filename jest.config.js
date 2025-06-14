const { getJestProjects } = require('@nx/jest');

module.exports = {
  projects: getJestProjects(),
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'libs/**/*.{ts,tsx}',
    'apps/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/*.spec.{ts,tsx}',
    '!**/*.test.{ts,tsx}',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
