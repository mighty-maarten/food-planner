import { describe, expect, it } from 'vitest';
import {
    copyName,
    toCopyState,
    duplicateLineKeys,
    isValidUrl,
    toFormState,
    toRequest,
    type DishFormLine,
} from '@/components/dishes/dish-form';

const line = (
    key: number,
    name: string,
    amount: number | null = null,
    unit = '',
): DishFormLine => ({
    key,
    name,
    amount,
    unit,
});

describe('dish form', () => {
    it('starts a new dish with one empty ingredient line', () => {
        const state = toFormState();
        expect(state.lines).toHaveLength(1);
        expect(state.lines[0]?.name).toBe('');
    });

    it('builds a trimmed request without empty lines and empty optional fields', () => {
        const request = toRequest({
            name: ' Risotto ',
            servings: 4,
            sourceUrl: '  ',
            recipe: '',
            tags: ['pasta'],
            lines: [line(1, ' Pompoen ', 1, ' stuk '), line(2, '  '), line(3, 'Ui', 0)],
        });

        expect(request).toEqual({
            name: 'Risotto',
            servings: 4,
            sourceUrl: null,
            recipe: null,
            tags: ['pasta'],
            ingredients: [
                { name: 'Pompoen', amount: 1, unit: 'stuk' },
                { name: 'Ui', amount: null, unit: null },
            ],
        });
    });

    it('fills the form from a dish', () => {
        const state = toFormState({
            id: 'dish-1',
            name: 'Risotto',
            recipe: null,
            sourceUrl: null,
            servings: null,
            tags: [],
            ingredients: [
                { ingredientId: 'i-1', name: 'Pompoen', categoryId: null, amount: 1, unit: null },
            ],
        });

        expect(state.lines).toEqual([
            expect.objectContaining({ name: 'Pompoen', amount: 1, unit: '' }),
        ]);
        expect(state.sourceUrl).toBe('');
    });

    it('offers an empty line for a dish without ingredients', () => {
        const state = toFormState({
            id: 'dish-1',
            name: 'Pasta pesto',
            recipe: null,
            sourceUrl: null,
            servings: null,
            tags: [],
            ingredients: [],
        });
        expect(state.lines).toHaveLength(1);
    });

    it('names a copy after the dish, with a number when that name is taken', () => {
        expect(copyName('Risotto', ['Risotto'])).toBe('Risotto (kopie)');
        expect(copyName('Risotto', ['Risotto', 'risotto (KOPIE)'])).toBe('Risotto (kopie 2)');
    });

    it('copies the ingredients, recipe, servings and tags of a dish', () => {
        const state = toCopyState(
            {
                id: 'dish-1',
                name: 'Risotto',
                recipe: '1. Fruit de ui.',
                sourceUrl: 'https://example.com/risotto',
                servings: 4,
                tags: ['risotto'],
                ingredients: [
                    {
                        ingredientId: 'i-1',
                        name: 'Rijst',
                        categoryId: null,
                        amount: 300,
                        unit: 'g',
                    },
                ],
            },
            ['Risotto'],
        );

        expect(state).toMatchObject({
            name: 'Risotto (kopie)',
            recipe: '1. Fruit de ui.',
            sourceUrl: 'https://example.com/risotto',
            servings: 4,
            tags: ['risotto'],
            lines: [expect.objectContaining({ name: 'Rijst', amount: 300, unit: 'g' })],
        });
    });

    it('marks later lines with the same ingredient as duplicates', () => {
        const duplicates = duplicateLineKeys([
            line(1, 'Ui'),
            line(2, 'Tomaat'),
            line(3, ' ui '),
            line(4, ''),
        ]);
        expect([...duplicates]).toEqual([3]);
    });

    it.each([
        ['https://www.example.com/recept', true],
        ['http://example.be', true],
        ['www.example.com', false],
        ['https://', false],
    ])('validates the source URL %s', (url, valid) => {
        expect(isValidUrl(url)).toBe(valid);
    });
});
