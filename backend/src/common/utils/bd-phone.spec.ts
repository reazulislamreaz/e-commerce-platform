import { normalizeBdPhone } from './bd-phone';

describe('normalizeBdPhone', () => {
  it.each([
    ['01712345678', '+8801712345678'],
    ['+8801712345678', '+8801712345678'],
    ['8801712345678', '+8801712345678'],
    ['017 1234 5678', '+8801712345678'],
    ['017-1234-5678', '+8801712345678'],
    ['01319876543', '+8801319876543'],
    ['01998765432', '+8801998765432'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeBdPhone(input)).toBe(expected);
  });

  it.each([
    '0171234567', // too short
    '017123456789', // too long
    '01212345678', // 012 is not a BD operator prefix
    '+8802123456789', // landline-style
    '+9101712345678', // wrong country code
    '1712345678', // missing leading 0 / country code
    'abcdefghijk',
    '',
  ])('rejects %s', (input) => {
    expect(normalizeBdPhone(input)).toBeNull();
  });
});
