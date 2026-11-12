import { ApiError } from '@/lib/api/errors';
import { financeActionErrorMessage } from '@/lib/finance/finance-messages';

describe('financeActionErrorMessage', () => {
  it('maps opening balance conflict', () => {
    const error = new ApiError(409, { code: 'OPENING_BALANCE_EXISTS', message: 'x' });
    expect(financeActionErrorMessage(error)).toContain('saldo inicial');
  });
});
