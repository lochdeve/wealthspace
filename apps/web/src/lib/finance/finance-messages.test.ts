import { ApiError, INVALID_INPUT_MESSAGE } from '@/lib/api/errors';
import { financeActionErrorMessage } from '@/lib/finance/finance-messages';

describe('financeActionErrorMessage', () => {
  it('maps opening balance conflict', () => {
    const error = new ApiError(409, { code: 'OPENING_BALANCE_EXISTS', message: 'x' });
    expect(financeActionErrorMessage(error)).toContain('saldo inicial');
  });

  it('hides English validation messages', () => {
    const error = new ApiError(400, { message: ['property categoryId should not exist'] });
    expect(financeActionErrorMessage(error)).toBe(INVALID_INPUT_MESSAGE);
  });
});
