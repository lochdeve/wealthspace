import { fixedAmountSplitHint, percentSplitHint } from './split-input-hints';

describe('percentSplitHint', () => {
  it('reports exact sum', () => {
    expect(percentSplitHint(['50', '30', '20'])).toMatch(/suman 100/i);
  });

  it('reports shortfall', () => {
    expect(percentSplitHint(['50', '30'])).toMatch(/Faltan 20/i);
  });
});

describe('fixedAmountSplitHint', () => {
  it('reports exact sum', () => {
    expect(fixedAmountSplitHint('80', ['50', '30'])).toMatch(/suman el total/i);
  });

  it('reports surplus', () => {
    expect(fixedAmountSplitHint('80', ['50', '40'])).toMatch(/Sobran/i);
  });
});
