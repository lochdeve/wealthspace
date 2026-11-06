/** @type {import('jest').Config} */
const config = {
  globalSetup: '<rootDir>/database/jest-db-global-setup.ts',
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testMatch: ['<rootDir>/database/**/*.integration.spec.ts'],
  modulePathIgnorePatterns: ['<rootDir>/database/helpers.ts'],
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
  testEnvironment: 'node',
  testTimeout: 30_000,
  maxWorkers: 1,
};

export default config;
