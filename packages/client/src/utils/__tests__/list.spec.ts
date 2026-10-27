import { describe, expect, it } from 'vitest';
import type { ListItem } from '@/api/services/types/plans';
import { describeSources, groupItemsByCategory } from '@/utils/list';

const item = (
    name: string,
    categoryId: string | null,
    neededBy: string | null = null,
): ListItem => ({
    id: name,
    ingredientId: name,
    name,
    categoryId,
    storeIds: [],
    defaultStoreIds: [],
    storeOverride: false,
    note: null,
    neededBy,
    neededByOverride: false,
    manual: false,
    sources: [],
    addedBy: null,
    checkedAt: null,
    checkedBy: null,
});

const categories = [
    { id: 'fruit', name: 'Groenten & fruit', position: 1 },
    { id: 'dairy', name: 'Zuivel', position: 2 },
];

describe('groupItemsByCategory', () => {
    it('follows the category order and puts uncategorised items last', () => {
        const groups = groupItemsByCategory(
            [item('Brood', null), item('Melk', 'dairy'), item('Ui', 'fruit'), item('X', 'gone')],
            categories,
        );

        expect(groups.map((group) => [group.id, group.items.map((i) => i.name)])).toEqual([
            ['fruit', ['Ui']],
            ['dairy', ['Melk']],
            [null, ['Brood', 'X']],
        ]);
    });

    it('sorts by needed-by date, items without a date last', () => {
        const [group] = groupItemsByCategory(
            [
                item('Prei', 'fruit'),
                item('Ui', 'fruit', '2026-11-02'),
                item('Appel', 'fruit'),
                item('Tomaat', 'fruit', '2026-10-30'),
            ],
            categories,
        );

        expect(group?.items.map((i) => i.name)).toEqual(['Tomaat', 'Ui', 'Appel', 'Prei']);
    });
});

describe('describeSources', () => {
    it('lists the dishes with their amounts', () => {
        expect(
            describeSources({
                ...item('Ui', 'fruit'),
                sources: [
                    { date: '2026-10-29', dishId: 'a', dishName: 'Soep', amount: 2, unit: null },
                    {
                        date: '2026-10-30',
                        dishId: 'b',
                        dishName: 'Curry',
                        amount: null,
                        unit: null,
                    },
                ],
            }),
        ).toBe('Soep (2), Curry');
    });
});
