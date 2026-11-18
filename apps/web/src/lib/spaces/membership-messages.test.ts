import { ApiError, GENERIC_ERROR_MESSAGE } from '@/lib/api/errors';
import { membershipActionErrorMessage } from '@/lib/spaces/membership-messages';

describe('membershipActionErrorMessage', () => {
  it('hints transfer for sole owner leave', () => {
    const error = new ApiError(409, {
      code: 'CANNOT_LEAVE_AS_SOLE_OWNER',
      message: 'raw',
    });
    const message = membershipActionErrorMessage(error);
    expect(message).toMatch(/Transfiere el ownership/i);
  });

  it('maps transfer conflict codes', () => {
    const error = new ApiError(409, { code: 'TRANSFER_TO_SELF', message: 'raw' });
    expect(membershipActionErrorMessage(error)).toMatch(/ti mismo/i);
  });

  it('does not show the API message when the code is unknown', () => {
    const error = new ApiError(409, { code: 'OTHER', message: 'Mensaje API' });
    expect(membershipActionErrorMessage(error)).toBe(GENERIC_ERROR_MESSAGE);
  });

  it('returns generic copy for non-ApiError', () => {
    expect(membershipActionErrorMessage(new Error('boom'))).toBe(GENERIC_ERROR_MESSAGE);
  });
});
