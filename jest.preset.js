const nxPreset = require('@nx/jest/preset').default;

module.exports = {
  ...nxPreset,
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@dna/(.*)$': '<rootDir>/libs/$1/src/index.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/../../jest.setup.js'],
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.base.json',
      isolatedModules: true,
    },
  },
  testMatch: [
    '<rootDir>/**/*.{test,spec}.{js,ts}',
    '<rootDir>/**/__tests__/**/*.{js,ts}',
  ],
};
