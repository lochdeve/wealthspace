import { ApiError } from '@/lib/api/errors';
import { sharedExpenseActionErrorMessage } from './shared-expense-messages';

describe('sharedExpenseActionErrorMessage', () => {
  it('translates split errors by code', () => {
    const error = new ApiError(400, {
      code: 'SPLIT_SHARE_ZERO',
      message: 'raw',
    });
    expect(sharedExpenseActionErrorMessage(error)).toMatch(/parte 0/i);
  });
});
