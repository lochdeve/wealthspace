import { settlementWarningMessage } from './settlement-messages';

describe('settlementWarningMessage', () => {
  it('explains exceeds pending debt', () => {
    expect(settlementWarningMessage('SETTLEMENT_EXCEEDS_PENDING_DEBT')).toMatch(/supera la deuda/i);
  });
});
