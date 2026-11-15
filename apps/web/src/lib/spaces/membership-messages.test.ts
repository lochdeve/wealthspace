import { ApiError, GENERIC_ERROR_MESSAGE } from '@/lib/api/errors';
import { membershipActionErrorMessage } from '@/lib/spaces/membership-messages';

describe('membershipActionErrorMessage', () => {
  it('does not promise ownership transfer to a sole owner', () => {
    const error = new ApiError(409, {
      code: 'CANNOT_LEAVE_AS_SOLE_OWNER',
      message: 'raw',
    });
    const message = membershipActionErrorMessage(error);
    expect(message).toBe(
      'Eres el único propietario de este espacio, así que por ahora no puedes salir de él.',
    );
    expect(message).not.toMatch(/transfer|invita/i);
  });

  it('does not show the API message when the code is unknown', () => {
    const error = new ApiError(409, { code: 'OTHER', message: 'Mensaje API' });
    expect(membershipActionErrorMessage(error)).toBe(GENERIC_ERROR_MESSAGE);
  });

  it('returns generic copy for non-ApiError', () => {
    expect(membershipActionErrorMessage(new Error('boom'))).toBe(GENERIC_ERROR_MESSAGE);
  });
});
