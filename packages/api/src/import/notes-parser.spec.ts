import { parseExport, parseLine, splitList } from './notes-parser.js';

describe('parseLine', () => {
    it.each([
        ['Do: fitte schotel met quinoa', 'Fitte schotel met quinoa'],
        ['Zo biefstuk met patatten en groenten', 'Biefstuk met patatten en groenten'],
        ['Vr. Spaghetti', 'Spaghetti'],
        ['DI: mais in de oven met runds en patatten', 'Mais in de oven met runds en patatten'],
        [
            '- [ ] Ma: pitta met bloemkool en courgette, pijpajuin',
            'Pitta met bloemkool en courgette, pijpajuin',
        ],
        ['Za middag: zalm met aardappelen en spinazie', 'Zalm met aardappelen en spinazie'],
        [
            'Do reco: aardappelen met groenten en varkenshaasje',
            'Aardappelen met groenten en varkenshaasje',
        ],
        ['Do: Belga => Griekse pasta', 'Griekse pasta'],
        ['Zo: frietjes!', 'Frietjes'],
        ['Ma: runds met patatten en wortel?', 'Runds met patatten en wortel'],
        ['Za: (pizza)', 'Pizza'],
        ['Do: wraps met rode bonen, sla,   Zure room', 'Wraps met rode bonen, sla, Zure room'],
    ])('reads "%s" as the dish "%s"', (line, name) => {
        expect(parseLine(line)).toMatchObject({ kind: 'dish', name });
    });

    it.each(['Zo: /', 'Za:/', 'Vr:', 'Wo: x', 'Za: / (quiche voor maud)', 'Ma: ?'])(
        'reads "%s" as no cooking',
        (line) => {
            expect(parseLine(line)?.kind).toBe('no-cooking');
        },
    );

    it.each([
        'Ma: uit eten',
        'Wo op het werk',
        'Di: bij mama',
        'Vr: mama?',
        'Ma oudejaarsavond',
        'Za: bestellen bij samprita',
    ])('reads "%s" as not a dish', (line) => {
        expect(parseLine(line)?.kind).toBe('not-a-dish');
    });

    it('takes the URL out of the name', () => {
        expect(
            parseLine(
                'Ma: Boekweitsalade (https://etenuitdevolkstuin.nl/2015/02/06/boekweit-salade-van-ottolenghi-recept/)',
            ),
        ).toMatchObject({
            name: 'Boekweitsalade',
            sourceUrl:
                'https://etenuitdevolkstuin.nl/2015/02/06/boekweit-salade-van-ottolenghi-recept/',
        });
        expect(
            parseLine(
                'Vr: Pasta met rode pesto, mozzarella https://njam.tv/recepten/orecchiette-met-rode-pesto)',
            ),
        ).toMatchObject({
            name: 'Pasta met rode pesto, mozzarella',
            sourceUrl: 'https://njam.tv/recepten/orecchiette-met-rode-pesto',
        });
    });

    it('reads ingredients between parentheses, but not notes', () => {
        expect(parseLine('Do: Cantonese rijst (ei, hesp, prei, wortel, erwt)')).toMatchObject({
            name: 'Cantonese rijst',
            listedIngredients: ['ei', 'hesp', 'prei', 'wortel', 'erwt'],
        });
        expect(parseLine('Za Luikse salade (zonder ajuin)')).toMatchObject({
            name: 'Luikse salade',
            listedIngredients: [],
        });
    });

    it('ignores lines that are not days', () => {
        expect(parseLine('Gerechten')).toBeNull();
        expect(parseLine('(pompoen aardappel kip/kalkoen)')).toBeNull();
    });
});

describe('splitList', () => {
    it('splits on commas, "en", "of", "+" and "/"', () => {
        expect(splitList('ei, hesp en prei + wortel/erwt of mais…')).toEqual([
            'ei',
            'hesp',
            'prei',
            'wortel',
            'erwt',
            'mais',
        ]);
    });
});

describe('parseExport', () => {
    it('reads every day line', () => {
        const entries = parseExport('Gerechten\n\nVr: uitsmijter\nZa: /\n\nDo: wok met tofu\n');
        expect(entries.map((e) => [e.kind, e.name])).toEqual([
            ['dish', 'Uitsmijter'],
            ['no-cooking', ''],
            ['dish', 'Wok met tofu'],
        ]);
    });
});
