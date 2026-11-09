/** Minimum length matches production JWT_SECRET validation (tests only). */
export const TEST_JWT_SECRET = 'integration-test-jwt-secret-32-characters!!';

export function applyTestApiEnv(databaseUrl: string): void {
  process.env['DATABASE_URL'] = databaseUrl;
  process.env['API_PORT'] = '3001';
  process.env['JWT_SECRET'] = TEST_JWT_SECRET;
}
