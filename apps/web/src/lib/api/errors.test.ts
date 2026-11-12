import {
  ApiError,
  apiUnavailableUserMessage,
  formatApiMessage,
  isApiErrorPayload,
  parseErrorResponse,
} from '@/lib/api/errors';

describe('formatApiMessage', () => {
  it('returns undefined when message is absent', () => {
    expect(formatApiMessage(undefined)).toBeUndefined();
  });

  it('returns string messages as-is', () => {
    expect(formatApiMessage('solo')).toBe('solo');
  });

  it('joins validation message arrays', () => {
    expect(formatApiMessage(['a', 'b'])).toBe('a b');
  });
});

describe('isApiErrorPayload', () => {
  it('rejects non-objects', () => {
    expect(isApiErrorPayload(null)).toBe(false);
    expect(isApiErrorPayload('text')).toBe(false);
  });

  it('accepts payloads with statusCode, message or code', () => {
    expect(isApiErrorPayload({ code: 'X' })).toBe(true);
    expect(isApiErrorPayload({ message: 'm' })).toBe(true);
    expect(isApiErrorPayload({})).toBe(false);
  });
});

describe('ApiError', () => {
  it('uses HTTP fallback when payload has no message', () => {
    const error = new ApiError(404, { code: 'NOT_FOUND' });
    expect(error.message).toBe('HTTP 404');
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

  it('falls back to statusText when body is not JSON', async () => {
    const response = new Response('not-json', {
      status: 502,
      statusText: 'Bad Gateway',
    });

    const error = await parseErrorResponse(response);
    expect(error.statusCode).toBe(502);
    expect(error.message).toBe('Bad Gateway');
  });

  it('ignores JSON that is not an error payload', async () => {
    const response = new Response(JSON.stringify({ foo: 'bar' }), {
      status: 400,
      statusText: 'Bad Request',
    });

    const error = await parseErrorResponse(response);
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('HTTP 400');
  });
});

describe('apiUnavailableUserMessage', () => {
  it('returns Spanish copy for 5xx errors', () => {
    const error = new ApiError(503, { message: 'raw' });
    expect(apiUnavailableUserMessage(error)).toContain('no están disponibles');
  });

  it('returns the ApiError message for non-5xx', () => {
    const error = new ApiError(409, { message: 'Conflicto' });
    expect(apiUnavailableUserMessage(error)).toBe('Conflicto');
  });
});
