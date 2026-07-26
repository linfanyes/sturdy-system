/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.spec.ts', '**/*.spec.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@gardener/shared/(.*)$': '<rootDir>/../shared/$1',
  },
  transform: {
    // .vue 单文件组件由 vue3-jest 编译（内部用 babel 剥离 TS）
    '^.+\\.vue$': '@vue/vue3-jest',
    '^.+\\.[tj]sx?$': ['ts-jest', { tsconfig: { allowJs: true, esModuleInterop: true }, diagnostics: false }],
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  // 允许对 ESM-only 的依赖（如图标库）做转译，避免 Cannot use import statement
  transformIgnorePatterns: ['/node_modules/(?!(lucide-vue-next|@vue|nanoid)/)'],
  collectCoverage: false, // 默认 test 不收集；test:coverage 通过 --coverage 开启
  // 覆盖率采集范围（仅 src，排除入口/类型/测试文件）
  collectCoverageFrom: [
    'src/**/*.{ts,vue}',
    '!src/**/*.d.ts',
    '!src/main.ts',
    '!src/**/index.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'clover'],
  // 回归门禁：仅在 `test:coverage`（CI 中执行）时生效；冒烟用例位于 test/integration，
  // 不参与 src 覆盖率统计，天然被排除。当前基线与报告目标见 TEST_REPORT.md 第 8 节。
  coverageThreshold: {
    global: {
      statements: 55,
      branches: 40,
      functions: 45,
      lines: 55,
    },
  },
  verbose: true,
}
