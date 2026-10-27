import { parseExport } from './notes-parser.js';
import {
    clusterDishes,
    clusterIngredients,
    proposeIngredients,
    similarity,
    stem,
} from './clustering.js';

describe('similarity', () => {
    it('ignores word order, filler words and "/"', () => {
        expect(
            similarity('Pitta met bloemkool en courgette', 'Pitta met bloemkool/courgette'),
        ).toBe(1);
        expect(
            similarity(
                'Spelt met olijven, kerstomaatjes, tonijn, basilicum, selder, pijpajuin',
                'Spelt met tonijn, kerstomaatjes, pijpajuin, olijven, selder',
            ),
        ).toBeGreaterThanOrEqual(0.75);
    });

    it('allows small typos', () => {
        expect(similarity('Boekweitsalade', 'Boeekweitsalade')).toBe(1);
    });

    it('keeps different dishes apart', () => {
        expect(similarity('Spaghetti', 'Spaghetti carbonara')).toBeLessThan(0.75);
        expect(
            similarity('Runds met patatten en boontjes', 'Runds met patatten en bloemkool'),
        ).toBeLessThan(0.75);
    });
});

describe('stem', () => {
    it.each([
        ['tomaten', 'tomaat'],
        ['patatten', 'patat'],
        ['erwtjes', 'erwten'],
        ['champignons', 'champignon'],
        ["paprika's", 'paprika'],
    ])('treats %s and %s alike', (a, b) => {
        expect(stem(a)).toBe(stem(b));
    });
});

describe('proposeIngredients', () => {
    it('reads the ingredients from the name', () => {
        expect(proposeIngredients('Zalm met erwten en patatten')).toEqual([
            'Zalm',
            'Erwten',
            'Patatten',
        ]);
    });

    it('leaves out dish types, but maps risotto to its rice', () => {
        expect(proposeIngredients('Wok met noedels en tofu')).toEqual(['Noedels', 'Tofu']);
        expect(proposeIngredients('Risotto met pompoen en champignons')).toEqual([
            'Risottorijst',
            'Pompoen',
            'Champignons',
        ]);
    });

    it('does not take the name of a dish for an ingredient', () => {
        expect(proposeIngredients('Hippe waterzooi')).toEqual([]);
        expect(proposeIngredients('Spaghetti')).toEqual(['Spaghetti']);
        expect(proposeIngredients('Rijst met wok en kip')).toEqual(['Rijst', 'Kip']);
    });

    it('adds listed ingredients without duplicates', () => {
        expect(proposeIngredients('Rijst met ei', ['ei', 'hesp'])).toEqual(['Rijst', 'Ei', 'Hesp']);
    });
});

describe('clusterDishes', () => {
    const entries = parseExport(
        [
            'Ma: Pitta met bloemkool en courgette',
            'Di: pitta met bloemkool en courgette',
            'Wo: Pitta met bloemkool/courgette',
            'Do: Spaghetti',
            'Vr: spaghetti carbonara',
            'Za: /',
            'Zo: uit eten',
            'Ma: Boekweitsalade (https://example.com/boekweit)',
            'Wo: Boekweitsalade',
            'Di: Boeekweitsalade',
        ].join('\n'),
    );
    const clusters = clusterDishes(entries);

    it('merges variants and counts how often a dish was planned', () => {
        expect(clusters.map((c) => [c.name, c.count])).toEqual([
            ['Boekweitsalade', 3],
            ['Pitta met bloemkool en courgette', 3],
            ['Spaghetti', 1],
            ['Spaghetti carbonara', 1],
        ]);
        expect(clusters[1]?.variants).toEqual([
            { name: 'Pitta met bloemkool en courgette', count: 2 },
            { name: 'Pitta met bloemkool/courgette', count: 1 },
        ]);
    });

    it('keeps the source URL of any variant', () => {
        expect(clusters[0]?.sourceUrl).toBe('https://example.com/boekweit');
    });

    it('groups spellings of an ingredient', () => {
        const ingredients = clusterIngredients([
            { name: 'A', count: 3, sourceUrl: null, ingredients: ['Tomaten'], variants: [] },
            { name: 'B', count: 1, sourceUrl: null, ingredients: ['Tomaat'], variants: [] },
        ]);
        expect(ingredients).toEqual([
            {
                name: 'Tomaten',
                count: 4,
                variants: [
                    { name: 'Tomaten', count: 3 },
                    { name: 'Tomaat', count: 1 },
                ],
            },
        ]);
    });
});
