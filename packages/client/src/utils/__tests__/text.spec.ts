import { describe, expect, it } from 'vitest';
import { TextUtil } from '@/utils/text';
import { formatAmount } from '@/utils/amount';

describe('TextUtil.matches', () => {
    it('ignores case and accents', () => {
        expect(TextUtil.matches('creme', 'Crème fraîche')).toBe(true);
    });

    it('needs every word, in any of the values', () => {
        expect(TextUtil.matches('risotto pompoen', 'Risotto', 'Pompoen', 'Parmezaan')).toBe(true);
        expect(TextUtil.matches('risotto zalm', 'Risotto', 'Pompoen')).toBe(false);
    });

    it('matches everything for an empty query', () => {
        expect(TextUtil.matches('  ', 'Risotto')).toBe(true);
    });
});

describe('TextUtil.highlight', () => {
    it('marks every word of the query, ignoring case and accents', () => {
        expect(TextUtil.highlight('creme kip', 'Kip met crème fraîche')).toEqual([
            { text: 'Kip', match: true },
            { text: ' met ', match: false },
            { text: 'crème', match: true },
            { text: ' fraîche', match: false },
        ]);
    });

    it('marks repeated and overlapping matches', () => {
        expect(TextUtil.highlight('aa', 'aaa b')).toEqual([
            { text: 'aaa', match: true },
            { text: ' b', match: false },
        ]);
    });

    it('returns the whole value unmarked for an empty query', () => {
        expect(TextUtil.highlight(' ', 'Risotto')).toEqual([{ text: 'Risotto', match: false }]);
    });
});

describe('formatAmount', () => {
    it.each([
        [300, 'g', '300 g'],
        [0.5, 'stuk', '0,5 stuk'],
        [2, null, '2'],
        [null, 'snuifje', 'snuifje'],
        [null, null, ''],
    ])('formats %s %s as "%s"', (amount, unit, expected) => {
        expect(formatAmount(amount, unit)).toBe(expected);
    });
});
