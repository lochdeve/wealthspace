/** @type {import('jest').Config} */
const config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.spec.json',
      },
    ],
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  /** Unit layer only (domain HTTP flows: `pnpm test:db`). */
  collectCoverageFrom: ['config/env.ts', 'health/health.controller.ts', '!**/*.spec.ts'],
  coverageDirectory: '../coverage',
  coverageThreshold: {
    global: {
      branches: 74,
      functions: 85,
      lines: 80,
      statements: 80,
    },
  },
  testEnvironment: 'node',
};

export default config;
