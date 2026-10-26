import { SnakeNamingStrategy } from './snake-naming.strategy.js';

describe('SnakeNamingStrategy', () => {
    const strategy = new SnakeNamingStrategy();

    it('converts camelCase property names to snake_case columns', () => {
        expect(strategy.columnName('lastLoginAt', undefined, [])).toBe('last_login_at');
        expect(strategy.columnName('passwordHash', undefined, [])).toBe('password_hash');
    });

    it('keeps an explicit column name', () => {
        expect(strategy.columnName('lastLoginAt', 'logged_in', [])).toBe('logged_in');
    });

    it('prefixes embedded columns', () => {
        expect(strategy.columnName('countryCode', undefined, ['brief'])).toBe('brief_country_code');
    });

    it('builds snake_case join columns', () => {
        expect(strategy.joinColumnName('createdBy', 'id')).toBe('created_by_id');
    });
});
