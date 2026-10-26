import { IsoDate } from './dates.js';

describe('IsoDate', () => {
    it.each([
        ['2026-10-29', true],
        ['2028-02-29', true],
        ['2026-02-29', false],
        ['2026-13-01', false],
        ['2026-1-01', false],
        ['29-10-2026', false],
    ])('validates %s', (value, valid) => {
        expect(IsoDate.isValid(value)).toBe(valid);
    });

    it('adds days across months and daylight saving changes', () => {
        expect(IsoDate.addDays('2026-10-24', 7)).toBe('2026-10-31');
        expect(IsoDate.addDays('2026-10-31', 1)).toBe('2026-11-01');
        expect(IsoDate.addDays('2026-03-01', -1)).toBe('2026-02-28');
    });

    it('lists every date of a range', () => {
        expect(IsoDate.range('2026-10-29', '2026-11-04')).toEqual([
            '2026-10-29',
            '2026-10-30',
            '2026-10-31',
            '2026-11-01',
            '2026-11-02',
            '2026-11-03',
            '2026-11-04',
        ]);
        expect(IsoDate.range('2026-10-29', '2026-10-28')).toEqual([]);
    });
});
