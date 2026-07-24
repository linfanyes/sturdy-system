/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.spec.ts', '**/*.spec.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^../../common/(.*)$': '<rootDir>/src/common/$1',
  },
  // 覆盖预设：同时转换 .ts 与 .js（allowJs），以便直接 import/require src 下的 ESM .js 源文件
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: { allowJs: true, esModuleInterop: true }, diagnostics: false }],
  },
  collectCoverage: false,
  verbose: true,
}
