import { sharedExpenseParticipantError } from './shared-expense-participants';

describe('sharedExpenseParticipantError', () => {
  it('blocks solo-member spaces', () => {
    expect(sharedExpenseParticipantError('MEMBER', 'ana', ['ana'], 1)).toMatch(
      /dos personas en el espacio/i,
    );
  });

  it('allows payer plus another participant', () => {
    expect(sharedExpenseParticipantError('MEMBER', 'ana', ['ana', 'carlos'], 2)).toBeUndefined();
  });

  it('allows payer not in participant list', () => {
    expect(sharedExpenseParticipantError('MEMBER', 'ana', ['carlos'], 2)).toBeUndefined();
  });

  it('rejects when only the payer is selected', () => {
    expect(sharedExpenseParticipantError('MEMBER', 'ana', ['ana'], 2)).toMatch(
      /distinta del pagador/i,
    );
  });
});
