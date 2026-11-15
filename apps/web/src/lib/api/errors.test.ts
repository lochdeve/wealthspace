import {
  ApiError,
  formatApiMessage,
  GENERIC_ERROR_MESSAGE,
  INVALID_INPUT_MESSAGE,
  isApiErrorPayload,
  parseErrorResponse,
  SERVICE_UNAVAILABLE_MESSAGE,
  SESSION_EXPIRED_MESSAGE,
  userErrorMessage,
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

describe('userErrorMessage', () => {
  const messages = { KNOWN: 'Mensaje conocido' };

  it('maps known codes', () => {
    const error = new ApiError(409, { code: 'KNOWN', message: 'raw' });
    expect(userErrorMessage(error, messages)).toBe('Mensaje conocido');
  });

  it.each([
    [503, SERVICE_UNAVAILABLE_MESSAGE],
    [401, SESSION_EXPIRED_MESSAGE],
    [400, INVALID_INPUT_MESSAGE],
    [409, 'Alternativa'],
  ])('uses Spanish copy by status %i for unknown codes', (status, expected) => {
    const error = new ApiError(status, { code: 'OTHER', message: 'English API message' });
    expect(userErrorMessage(error, messages, 'Alternativa')).toBe(expected);
  });

  it('never exposes the API message', () => {
    const error = new ApiError(400, { message: ['amount must be a positive decimal'] });
    expect(userErrorMessage(error, messages)).not.toContain('amount');
  });

  it('returns the fallback for non-API errors', () => {
    expect(userErrorMessage(new Error('boom'), messages)).toBe(GENERIC_ERROR_MESSAGE);
  });
});
