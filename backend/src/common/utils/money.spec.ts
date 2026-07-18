import { poishaToTaka, STANDARD_SHIPPING_POISHA, takaToPoisha } from './money';

describe('money helpers', () => {
  it('converts taka to poisha and back', () => {
    expect(takaToPoisha(1190)).toBe(119_000n);
    expect(poishaToTaka(119_000n)).toBe(1190);
  });

  it('uses 120 taka standard shipping', () => {
    expect(poishaToTaka(STANDARD_SHIPPING_POISHA)).toBe(120);
  });
});
