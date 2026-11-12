import { toQueryString } from '@/lib/api/query';

describe('toQueryString', () => {
  it('omits undefined values', () => {
    expect(toQueryString({ accountId: 'abc', type: undefined })).toBe('?accountId=abc');
  });

  it('returns empty when no params', () => {
    expect(toQueryString({})).toBe('');
  });
});
