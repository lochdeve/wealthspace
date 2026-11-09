import { ApiError, formatApiMessage, parseErrorResponse } from '@/lib/api/errors';

describe('formatApiMessage', () => {
  it('joins validation message arrays', () => {
    expect(formatApiMessage(['a', 'b'])).toBe('a b');
  });
});

describe('parseErrorResponse', () => {
  it('builds ApiError from JSON body', async () => {
    const response = new Response(
      JSON.stringify({
        statusCode: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      }),
      { status: 401, statusText: 'Unauthorized' },
    );

    const error = await parseErrorResponse(response);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('INVALID_CREDENTIALS');
    expect(error.statusCode).toBe(401);
  });
});
