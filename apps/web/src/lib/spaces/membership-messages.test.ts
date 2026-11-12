import { ApiError } from '@/lib/api/errors';
import { membershipActionErrorMessage } from '@/lib/spaces/membership-messages';

describe('membershipActionErrorMessage', () => {
  it('maps known membership API codes to Spanish copy', () => {
    const error = new ApiError(409, {
      code: 'CANNOT_LEAVE_AS_SOLE_OWNER',
      message: 'raw',
    });
    expect(membershipActionErrorMessage(error)).toBe(
      'Eres el único propietario. Transfiere el rol o invita a otro propietario antes de salir.',
    );
  });

  it('falls back to ApiError message when code is unknown', () => {
    const error = new ApiError(400, { code: 'OTHER', message: 'Mensaje API' });
    expect(membershipActionErrorMessage(error)).toBe('Mensaje API');
  });

  it('returns generic copy for non-ApiError', () => {
    expect(membershipActionErrorMessage(new Error('boom'))).toBe('No se pudo completar la acción.');
  });
});
