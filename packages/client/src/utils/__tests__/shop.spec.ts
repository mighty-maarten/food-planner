import { describe, expect, it } from 'vitest';
import type { ListItem, Plan } from '@/api/services/types/plans';
import { applyTick, buildShopList, isNeededSoon } from '@/utils/shop';

const item = (name: string, overrides: Partial<ListItem> = {}): ListItem => ({
    id: name,
    ingredientId: name,
    name,
    categoryId: null,
    storeIds: [],
    note: null,
    neededBy: null,
    neededByOverride: false,
    manual: false,
    sources: [],
    addedBy: null,
    checkedAt: null,
    checkedBy: null,
    ...overrides,
});

const plan = (items: ListItem[]): Plan => ({
    id: 'plan',
    startDate: '2026-10-29',
    endDate: '2026-11-04',
    days: [],
    items,
});

const categories = [
    { id: 'fruit', name: 'Groenten & fruit', position: 1 },
    { id: 'dairy', name: 'Zuivel', position: 2 },
    { id: 'frozen', name: 'Diepvries', position: 3 },
];
// Colruyt: frozen first, then dairy, then fruit
const stores = [
    { id: 'colruyt', name: 'Colruyt', categoryIds: ['frozen', 'dairy', 'fruit'] },
    { id: 'delhaize', name: 'Delhaize', categoryIds: ['fruit', 'dairy', 'frozen'] },
];

const items = [
    item('Ui', { categoryId: 'fruit' }),
    item('Erwten', { categoryId: 'frozen', storeIds: ['colruyt'] }),
    item('Yoghurt', { categoryId: 'dairy', storeIds: ['delhaize'] }),
    item('Brood'),
];

describe('buildShopList', () => {
    it('follows the route through the chosen store', () => {
        const list = buildShopList(plan(items), 'colruyt', categories, stores);

        expect(list.groups.map((g) => [g.categoryId, g.items.map((i) => i.name)])).toEqual([
            ['frozen', ['Erwten']],
            ['fruit', ['Ui']],
            [null, ['Brood']],
        ]);
    });

    it("shows the store's items and items without a store", () => {
        const names = buildShopList(plan(items), 'delhaize', categories, stores).groups.flatMap(
            (g) => g.items.map((i) => i.name),
        );
        expect(names).toEqual(['Ui', 'Yoghurt', 'Brood']);
    });

    it('shows everything in the default order without a store', () => {
        const list = buildShopList(plan(items), null, categories, stores);
        expect(list.groups.map((g) => g.categoryId)).toEqual(['fruit', 'dairy', 'frozen', null]);
    });

    it('moves ticked items to the bottom, most recent first', () => {
        const list = buildShopList(
            plan([
                item('Ui', { checkedAt: '2026-10-30T10:00:00Z' }),
                item('Prei', { checkedAt: '2026-10-30T10:05:00Z' }),
                item('Brood'),
            ]),
            null,
            categories,
            stores,
        );

        expect(list.groups.flatMap((g) => g.items.map((i) => i.name))).toEqual(['Brood']);
        expect(list.checked.map((i) => i.name)).toEqual(['Prei', 'Ui']);
    });
});

describe('isNeededSoon', () => {
    it('is true for today, tomorrow and overdue', () => {
        expect(isNeededSoon('2026-10-29', '2026-10-29')).toBe(true);
        expect(isNeededSoon('2026-10-30', '2026-10-29')).toBe(true);
        expect(isNeededSoon('2026-10-28', '2026-10-29')).toBe(true);
        expect(isNeededSoon('2026-10-31', '2026-10-29')).toBe(false);
        expect(isNeededSoon(null, '2026-10-29')).toBe(false);
    });
});

describe('applyTick', () => {
    it('ticks and unticks', () => {
        const user = { id: 'u', name: 'Jane' };
        const ticked = applyTick(item('Ui'), { checked: true, at: '2026-10-30T10:00:00Z' }, user);
        expect(ticked).toMatchObject({ checkedAt: '2026-10-30T10:00:00Z', checkedBy: user });
        expect(applyTick(ticked, { checked: false, at: 'x' }, user)).toMatchObject({
            checkedAt: null,
            checkedBy: null,
        });
    });
});
