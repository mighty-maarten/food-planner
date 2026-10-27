import { resolveIngredients, validateReview } from './import-loader.js';

describe('resolveIngredients', () => {
    it('uses the merged spelling and drops duplicates', () => {
        const aliases = new Map([['patatjes', 'Patatten']]);
        expect(resolveIngredients(['Zalm', 'Patatjes', 'patatten', 'zalm'], aliases)).toEqual([
            'Zalm',
            'Patatten',
        ]);
    });
});

describe('validateReview', () => {
    it('reports names that are too long and sources that are no URL', () => {
        const errors = validateReview({
            dishes: [
                {
                    name: 'x'.repeat(201),
                    count: 1,
                    sourceUrl: 'njam.tv',
                    ingredients: ['y'.repeat(101)],
                    variants: [],
                },
            ],
            skipped: [],
            ingredientAliases: new Map(),
        });
        expect(errors).toHaveLength(3);
    });
});
