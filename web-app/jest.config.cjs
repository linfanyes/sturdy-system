/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.spec.ts', '**/*.spec.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
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
  verbose: true,
}
