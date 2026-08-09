/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.spec.ts'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
    '^@napi-rs/canvas$': '<rootDir>/test/mocks/napi-canvas.ts',
    '^@gardener/shared/constants$': '<rootDir>/../shared/constants/index.ts',
    '^@gardener/shared/validators$': '<rootDir>/../shared/validators/index.ts',
    '^@gardener/shared/types$': '<rootDir>/../shared/types/index.ts',
    '^@gardener/shared/utils/(.*)$': '<rootDir>/../shared/utils/$1.ts',
    '^@gardener/shared/schemas/(.*)$': '<rootDir>/../shared/schemas/$1.ts',
  },
  collectCoverage: false,
  verbose: true,
}