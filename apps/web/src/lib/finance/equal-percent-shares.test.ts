import { defaultEqualPercents, percentsForUserIds } from './equal-percent-shares';

describe('defaultEqualPercents', () => {
  it('returns 100 for one participant', () => {
    expect(defaultEqualPercents(1)).toEqual(['100.00']);
  });

  it('splits 100 across three with remainder on the last', () => {
    expect(defaultEqualPercents(3)).toEqual(['33.33', '33.33', '33.34']);
    const sum = defaultEqualPercents(3).reduce((acc, row) => acc + Number.parseFloat(row), 0);
    expect(sum).toBeCloseTo(100, 2);
  });
});

describe('percentsForUserIds', () => {
  it('maps user ids to default percents', () => {
    expect(percentsForUserIds(['a', 'b', 'c'])).toEqual({
      a: '33.33',
      b: '33.33',
      c: '33.34',
    });
  });
});