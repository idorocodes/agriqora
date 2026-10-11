import { describe, expect, it } from 'vitest';
import { formatPhone, isValidPhone, normalizePhone, phonesMatch } from '../src/lib/phone';

describe('phone helpers', () => {
  it('normalizes local and international forms to one value', () => {
    expect(normalizePhone('0803 234 5678')).toBe('+2348032345678');
    expect(normalizePhone('+234 803 234 5678')).toBe('+2348032345678');
    expect(normalizePhone('2348032345678')).toBe('+2348032345678');
  });

  it('matches the phone format used by the backend seed data', () => {
    expect(phonesMatch('+234 803 234 5678', '08032345678')).toBe(true);
    expect(phonesMatch('+234 803 234 5678', '08032345679')).toBe(false);
  });

  it('rejects numbers that are too short', () => {
    expect(isValidPhone('0803')).toBe(false);
    expect(isValidPhone('0803 234 5678')).toBe(true);
  });

  it('formats Nigerian numbers for display', () => {
    expect(formatPhone('08032345678')).toBe('+234 803 234 5678');
  });
});
