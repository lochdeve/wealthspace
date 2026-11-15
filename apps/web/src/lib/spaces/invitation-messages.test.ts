import { ApiError } from '@/lib/api/errors';
import { invitationActionErrorMessage } from '@/lib/spaces/invitation-messages';

const FALLBACK = 'No se pudo enviar la invitación.';

describe('invitationActionErrorMessage', () => {
  it.each([
    ['INVITATION_ALREADY_PENDING', 409, 'Ya hay una invitación pendiente para ese correo.'],
    ['INVITEE_ALREADY_MEMBER', 409, 'Esa persona ya es miembro del espacio.'],
    ['INVITATION_EXPIRED', 409, 'La invitación ha caducado. Pide que te inviten de nuevo.'],
    ['ALREADY_MEMBER', 409, 'Ya eres miembro de este espacio.'],
    [
      'INVITATION_NOT_FOUND',
      404,
      'Esta invitación ya no está disponible: se ha revocado o ya se respondió.',
    ],
  ])('translates %s', (code, status, expected) => {
    const error = new ApiError(status, { code, message: 'English API message' });
    expect(invitationActionErrorMessage(error, FALLBACK)).toBe(expected);
  });

  it('uses the given fallback for unknown codes', () => {
    const error = new ApiError(409, { code: 'OTHER', message: 'English API message' });
    expect(invitationActionErrorMessage(error, FALLBACK)).toBe(FALLBACK);
  });
});
