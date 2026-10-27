import { assemblePlan, type ListItemRow } from './plan-assembly.js';

const item = (overrides: Partial<ListItemRow>): ListItemRow => ({
    id: 'item',
    ingredientId: 'ingredient',
    name: 'Ingredient',
    categoryId: null,
    defaultStoreIds: [],
    storeOverride: false,
    storeId: null,
    note: null,
    neededBy: null,
    manual: false,
    addedById: null,
    addedByName: null,
    checkedAt: null,
    checkedById: null,
    checkedByName: null,
    ...overrides,
});

const source = (itemId: string, date: string, dishName: string) => ({
    itemId,
    date,
    dishId: `dish-${dishName}`,
    dishName,
    amount: null,
    unit: null,
});

describe('assemblePlan', () => {
    const plan = { id: 'plan-1', startDate: '2026-10-29', endDate: '2026-10-31' };

    it('lists every day, with or without a dish', () => {
        const result = assemblePlan({
            plan,
            days: [{ date: '2026-10-30', dishId: 'risotto', dishName: 'Risotto' }],
            dishIngredients: [
                {
                    dishId: 'risotto',
                    ingredientId: 'rice',
                    name: 'Rijst',
                    categoryId: null,
                    amount: 300,
                    unit: 'g',
                },
            ],
            items: [],
            sources: [],
        });

        expect(result.days.map((day) => day.dish?.name ?? null)).toEqual([null, 'Risotto', null]);
        expect(result.days[1]?.dish?.ingredients).toEqual([
            { ingredientId: 'rice', name: 'Rijst', categoryId: null, amount: 300, unit: 'g' },
        ]);
    });

    it('needs an item by the first day a dish uses it, and lists those dishes in order', () => {
        const result = assemblePlan({
            plan,
            days: [],
            dishIngredients: [],
            items: [item({ id: 'onion', ingredientId: 'onion-id' })],
            sources: [
                source('onion', '2026-10-31', 'Curry'),
                source('onion', '2026-10-29', 'Soep'),
            ],
        });

        expect(result.items[0]).toMatchObject({
            neededBy: '2026-10-29',
            neededByOverride: false,
            sources: [{ dishName: 'Soep' }, { dishName: 'Curry' }],
        });
    });

    it('prefers a date set by hand', () => {
        const result = assemblePlan({
            plan,
            days: [],
            dishIngredients: [],
            items: [item({ id: 'onion', neededBy: '2026-10-30' })],
            sources: [source('onion', '2026-10-29', 'Soep')],
        });

        expect(result.items[0]).toMatchObject({ neededBy: '2026-10-30', neededByOverride: true });
    });

    it('has no date for a free item', () => {
        const result = assemblePlan({
            plan,
            days: [],
            dishIngredients: [],
            items: [item({ id: 'bread', manual: true })],
            sources: [],
        });

        expect(result.items[0]?.neededBy).toBeNull();
    });

    it.each([
        ['the default stores without an override', false, null, ['lidl', 'aldi']],
        ['the chosen store', true, 'carrefour', ['carrefour']],
        ['any store', true, null, []],
    ])('is bought at %s', (_case, storeOverride, storeId, storeIds) => {
        const result = assemblePlan({
            plan,
            days: [],
            dishIngredients: [],
            items: [item({ defaultStoreIds: ['lidl', 'aldi'], storeOverride, storeId })],
            sources: [],
        });

        expect(result.items[0]).toMatchObject({
            storeIds,
            defaultStoreIds: ['lidl', 'aldi'],
            storeOverride,
        });
    });

    it('marks the ingredients on the list per day', () => {
        const result = assemblePlan({
            plan,
            days: [{ date: '2026-10-29', dishId: 'soup', dishName: 'Soep' }],
            dishIngredients: [],
            items: [item({ id: 'onion', ingredientId: 'onion-id' })],
            sources: [source('onion', '2026-10-29', 'Soep')],
        });

        expect(result.days[0]?.selectedIngredientIds).toEqual(['onion-id']);
    });
});
