import { normalizeLanguage } from '../renderer/schedule-budget-contexts/LanguageContext';

describe('normalizeLanguage', () => {
  it('keeps supported languages', () => {
    expect(normalizeLanguage('ko')).toBe('ko');
    expect(normalizeLanguage('en')).toBe('en');
  });

  it('falls back to Korean for missing or corrupt values', () => {
    expect(normalizeLanguage(null)).toBe('ko');
    expect(normalizeLanguage('fr')).toBe('ko');
    expect(normalizeLanguage('')).toBe('ko');
  });
});
