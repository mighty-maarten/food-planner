import { readReview, ReviewFileError, writeReview } from './review-file.js';

const dish = {
    name: 'Pitta met bloemkool en courgette',
    count: 3,
    sourceUrl: 'https://example.com/pitta',
    ingredients: ['Pitta', 'Bloemkool', 'Courgette'],
    variants: [
        { name: 'Pitta met bloemkool en courgette', count: 2 },
        { name: 'Pitta met bloemkool/courgette', count: 1 },
    ],
};

describe('review file', () => {
    it('reads back what it writes', () => {
        const text = writeReview(
            [dish],
            [
                {
                    name: 'Uit eten',
                    count: 4,
                    sourceUrl: null,
                    ingredients: [],
                    variants: [{ name: 'Uit eten', count: 4 }],
                },
            ],
            [
                {
                    name: 'Patatten',
                    count: 10,
                    variants: [
                        { name: 'Patatten', count: 8 },
                        { name: 'Patatjes', count: 2 },
                    ],
                },
                { name: 'Zalm', count: 5, variants: [{ name: 'Zalm', count: 5 }] },
            ],
        );

        const review = readReview(text);

        expect(review.dishes).toEqual([dish]);
        expect(review.skipped.map((d) => d.name)).toEqual(['Uit eten']);
        expect([...review.ingredientAliases]).toEqual([['patatjes', 'Patatten']]);
    });

    it('counts a dish by its spellings, moved lines included', () => {
        const review = readReview(`
[dishes]
= Spaghetti bolognese
ingredients: Spaghetti
< Spaghetti | 130
< Spaghetti bolo | 5

= Nieuw gerecht
ingredients:
`);
        expect(review.dishes.map((d) => [d.name, d.count, d.ingredients])).toEqual([
            ['Spaghetti bolognese', 135, ['Spaghetti']],
            ['Nieuw gerecht', 1, []],
        ]);
    });

    it('reports mistakes with their line', () => {
        expect(() => readReview('[dishes]\n= Soep\n< soep met balletjes\n')).toThrow(
            /line 3: expected "< <spelling> \| <count>"/,
        );
        expect(() => readReview('[dishes]\n= Soep\n\n= soep\n')).toThrow(ReviewFileError);
        expect(() => readReview('= Soep\n')).toThrow(/line 1/);
    });
});
