import { CleanupFileError, readCleanup } from './cleanup-file.js';

describe('readCleanup', () => {
    it('reads ingredients, dishes and dishes to remove', () => {
        const cleanup = readCleanup(`
# a comment
[ingredients]
= Aardappelen | Groenten & fruit
< Patatten
< Puree
= Iets | -

[dishes]
= Runds met patatten en boontjes
ingredients: Biefstuk, Aardappelen, Boontjes
< Aardappelen met biefstuk en boontjes

= Spaghetti carbonara
< Carbonara

[remove-dishes]
= Simply you
`);

        expect(cleanup.ingredients).toEqual([
            { name: 'Aardappelen', category: 'Groenten & fruit', variants: ['Patatten', 'Puree'] },
            { name: 'Iets', category: null, variants: [] },
        ]);
        expect(cleanup.dishes).toEqual([
            {
                name: 'Runds met patatten en boontjes',
                ingredients: ['Biefstuk', 'Aardappelen', 'Boontjes'],
                variants: ['Aardappelen met biefstuk en boontjes'],
            },
            { name: 'Spaghetti carbonara', ingredients: null, variants: ['Carbonara'] },
        ]);
        expect(cleanup.removeDishes).toEqual(['Simply you']);
    });

    it('reports mistakes with their line', () => {
        expect(() => readCleanup('[ingredients]\n= Aardappelen\n')).toThrow(/line 2/);
        expect(() => readCleanup('= Soep\n')).toThrow(/line 1/);
        expect(() => readCleanup('[dishes]\ningredients: a\n')).toThrow(/line 2/);
    });

    it('rejects a name that occurs twice', () => {
        expect(() =>
            readCleanup(
                '[ingredients]\n= Ui | Groenten & fruit\n= Ajuin | Groenten & fruit\n< ui\n',
            ),
        ).toThrow(CleanupFileError);
    });
});
