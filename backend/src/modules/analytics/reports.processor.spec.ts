import { sanitizeSpreadsheetCell } from './reports.processor';

describe('sanitizeSpreadsheetCell', () => {
  it('prefixes formula injection triggers', () => {
    expect(sanitizeSpreadsheetCell('=1+1')).toBe("'=1+1");
    expect(sanitizeSpreadsheetCell('+1234')).toBe("'+1234");
    expect(sanitizeSpreadsheetCell('-100')).toBe("'-100");
    expect(sanitizeSpreadsheetCell('@SUM(A1)')).toBe("'@SUM(A1)");
  });

  it('leaves safe values unchanged', () => {
    expect(sanitizeSpreadsheetCell('Elevate Apparel')).toBe('Elevate Apparel');
    expect(sanitizeSpreadsheetCell('order-1001')).toBe('order-1001');
    expect(sanitizeSpreadsheetCell('')).toBe('');
  });
});
