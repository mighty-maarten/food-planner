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
