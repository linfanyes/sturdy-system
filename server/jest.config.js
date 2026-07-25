/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.spec.ts'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^@napi-rs/canvas$': '<rootDir>/test/mocks/napi-canvas.ts',
  },
  collectCoverage: false,
  verbose: true,
}
