import { Prisma } from '@prisma/client';
import { allocate, type AllocateParticipant } from './allocate';
import { AllocateError } from './allocate-error';

function byUser(parts: AllocateParticipant[]): Map<string, string> {
  return new Map(parts.map((p) => [p.userId, p.allocatedAmount]));
}

function expectSumEqualsTotal(
  parts: AllocateParticipant[],
  total: string,
): void {
  const sum = parts.reduce(
    (acc, p) => acc.plus(new Prisma.Decimal(p.allocatedAmount)),
    new Prisma.Decimal(0),
  );
  expect(sum.equals(new Prisma.Decimal(total))).toBe(true);
}

describe('allocate', () => {
  const ana = '00000000-0000-4000-8000-000000000001';
  const carlos = '00000000-0000-4000-8000-000000000002';
  const maria = '00000000-0000-4000-8000-000000000003';

  it('EQUAL 120 EUR between 3 → 40 each', () => {
    const parts = allocate('120.00', 'EUR', {
      mode: 'EQUAL',
      participantUserIds: [ana, carlos, maria],
    });
    const map = byUser(parts);
    expect(map.get(ana)).toBe('40.0000');
    expect(map.get(carlos)).toBe('40.0000');
    expect(map.get(maria)).toBe('40.0000');
    expectSumEqualsTotal(parts, '120');
  });

  it('EQUAL 100 EUR between 3 → 33.34 to lowest userId', () => {
    const parts = allocate('100.00', 'EUR', {
      mode: 'EQUAL',
      participantUserIds: [maria, carlos, ana],
    });
    const map = byUser(parts);
    expect(map.get(ana)).toBe('33.3400');
    expect(map.get(carlos)).toBe('33.3300');
    expect(map.get(maria)).toBe('33.3300');
    expectSumEqualsTotal(parts, '100');
  });

  it('PERCENTAGE 50 / 30 / 20 of 50 EUR', () => {
    const parts = allocate('50.00', 'EUR', {
      mode: 'PERCENTAGE',
      shares: [
        { userId: ana, percent: '50' },
        { userId: carlos, percent: '30' },
        { userId: maria, percent: '20' },
      ],
    });
    const map = byUser(parts);
    expect(map.get(ana)).toBe('25.0000');
    expect(map.get(carlos)).toBe('15.0000');
    expect(map.get(maria)).toBe('10.0000');
    expectSumEqualsTotal(parts, '50');
  });

  it('PERCENTAGE 33.33 / 33.33 / 33.34 of 10 EUR (largest remainder)', () => {
    const parts = allocate('10.00', 'EUR', {
      mode: 'PERCENTAGE',
      shares: [
        { userId: ana, percent: '33.33' },
        { userId: carlos, percent: '33.33' },
        { userId: maria, percent: '33.34' },
      ],
    });
    const map = byUser(parts);
    expect(map.get(ana)).toBe('3.3300');
    expect(map.get(carlos)).toBe('3.3300');
    expect(map.get(maria)).toBe('3.3400');
    expectSumEqualsTotal(parts, '10');
  });

  function expectAllocateError(run: () => unknown, code: string): void {
    try {
      run();
      throw new Error(`Expected AllocateError ${code}`);
    } catch (error) {
      expect(error).toBeInstanceOf(AllocateError);
      expect((error as AllocateError).code).toBe(code);
    }
  }

  it('rejects PERCENTAGE sum 90', () => {
    expectAllocateError(
      () =>
        allocate('90.00', 'EUR', {
          mode: 'PERCENTAGE',
          shares: [
            { userId: ana, percent: '50' },
            { userId: carlos, percent: '30' },
            { userId: maria, percent: '10' },
          ],
        }),
      'SPLIT_PERCENT_SUM_INVALID',
    );
  });

  it('rejects PERCENTAGE sum 99.99', () => {
    expectAllocateError(
      () =>
        allocate('100.00', 'EUR', {
          mode: 'PERCENTAGE',
          shares: [
            { userId: ana, percent: '33.33' },
            { userId: carlos, percent: '33.33' },
            { userId: maria, percent: '33.33' },
          ],
        }),
      'SPLIT_PERCENT_SUM_INVALID',
    );
  });

  it('rejects FIXED_AMOUNT when sum differs from total', () => {
    expectAllocateError(
      () =>
        allocate('80.00', 'EUR', {
          mode: 'FIXED_AMOUNT',
          shares: [
            { userId: ana, amount: '50' },
            { userId: carlos, amount: '20' },
            { userId: maria, amount: '5' },
          ],
        }),
      'SPLIT_AMOUNT_SUM_INVALID',
    );
  });

  it('rejects SPLIT_SHARE_ZERO for tiny EQUAL split (0.02 EUR / 3)', () => {
    expectAllocateError(
      () =>
        allocate('0.02', 'EUR', {
          mode: 'EQUAL',
          participantUserIds: [ana, carlos, maria],
        }),
      'SPLIT_SHARE_ZERO',
    );
  });

  it('rejects SPLIT_SHARE_ZERO when 1 JPY split leaves a zero share', () => {
    expectAllocateError(
      () =>
        allocate('1', 'JPY', {
          mode: 'PERCENTAGE',
          shares: [
            { userId: ana, percent: '34' },
            { userId: carlos, percent: '33' },
            { userId: maria, percent: '33' },
          ],
        }),
      'SPLIT_SHARE_ZERO',
    );
  });

  it('JPY with 0 minor units: 100 / 3', () => {
    const parts = allocate('100', 'JPY', {
      mode: 'EQUAL',
      participantUserIds: [ana, carlos, maria],
    });
    const map = byUser(parts);
    expect(map.get(ana)).toBe('34.0000');
    expect(map.get(carlos)).toBe('33.0000');
    expect(map.get(maria)).toBe('33.0000');
    expectSumEqualsTotal(parts, '100');
  });

  it('rejects excess decimal precision on total', () => {
    expectAllocateError(
      () =>
        allocate('10.001', 'EUR', {
          mode: 'EQUAL',
          participantUserIds: [ana, carlos],
        }),
      'AMOUNT_PRECISION_INVALID',
    );
  });

  it('rejects unsupported currency', () => {
    expectAllocateError(
      () =>
        allocate('10.00', 'XXX', {
          mode: 'EQUAL',
          participantUserIds: [ana],
        }),
      'CURRENCY_NOT_SUPPORTED',
    );
  });

  it('rejects duplicate participants', () => {
    expectAllocateError(
      () =>
        allocate('10.00', 'EUR', {
          mode: 'EQUAL',
          participantUserIds: [ana, ana],
        }),
      'DUPLICATE_PARTICIPANT',
    );
  });

  it('property: sum always equals total for random-ish EQUAL cases', () => {
    const ids = [ana, carlos, maria];
    const totals = ['1.00', '7.77', '99.99', '1200.50'];
    for (const total of totals) {
      const parts = allocate(total, 'EUR', {
        mode: 'EQUAL',
        participantUserIds: ids,
      });
      expectSumEqualsTotal(parts, total);
    }
  });
});
