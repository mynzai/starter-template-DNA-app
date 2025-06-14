module.exports = {
  displayName: 'testing',
  testEnvironment: 'node',
  preset: '../../jest.preset.js',
  testMatch: ['<rootDir>/src/**/*.{test,spec}.{js,ts}'],
  coverageDirectory: '../../coverage/libs/testing',
  collectCoverageFrom: [
    'src/**/*.{ts,js}',
    '!src/**/*.d.ts',
    '!src/**/*.spec.{ts,js}',
    '!src/**/*.test.{ts,js}',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.spec.json',
    }],
  },
  moduleNameMapper: {
    '^@dna/(.*)$': '<rootDir>/../../libs/$1/src/index.ts',
  },
};