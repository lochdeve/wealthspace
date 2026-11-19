import { debtLine, memberNetSummary } from './balance-view';

describe('debtLine', () => {
  it('formats a directed debt', () => {
    expect(debtLine('Carlos', 'Ana', '25.0000', 'EUR')).toMatch(/25/);
    expect(debtLine('Carlos', 'Ana', '25.0000', 'EUR')).toMatch(/Ana/);
  });
});

describe('memberNetSummary', () => {
  it('describes creditor and debtor nets', () => {
    expect(memberNetSummary('65.0000', 'EUR')).toMatch(/Le deben/);
    expect(memberNetSummary('-25.0000', 'EUR')).toMatch(/Debe/);
    expect(memberNetSummary('0.0000', 'EUR')).toBe('En equilibrio');
  });
});
