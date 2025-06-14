/* eslint-disable */
module.exports = {
  displayName: 'core',
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/libs/core',
  moduleNameMapper: {
    '^@dna/(.*)$': '<rootDir>/../../libs/$1/src/index.ts',
  },
};
